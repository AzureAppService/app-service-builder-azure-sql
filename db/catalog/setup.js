const fs = require('node:fs');
const path = require('node:path');
const sql = require('mssql');
const { createConfig } = require('../inventory/config');

const VERSION = 1;
const source = name => fs.readFileSync(path.join(__dirname, name), 'utf8');

async function bootstrap(pool) {
  const tx = pool.transaction();
  let rolledBack = false;
  tx.on('rollback', () => { rolledBack = true; });
  await tx.begin();
  try {
    const query = text => tx.request().query(text);
    await query(`
      DECLARE @result INT;
      EXEC @result = sys.sp_getapplock @Resource = N'shopstream-catalog-bootstrap',
        @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
      IF @result < 0 THROW 51030, 'Catalog bootstrap lock unavailable.', 1;
    `);
    const level = (await query('SELECT compatibility_level FROM sys.databases WHERE name = DB_NAME()')).recordset[0]?.compatibility_level;
    if (!Number.isInteger(level) || level < 160) {
      throw new Error('Database compatibility level must be at least 160; an administrator must update it before bootstrap');
    }
    const hasMarker = (await query("SELECT OBJECT_ID(N'dbo.shopstream_bootstrap', N'U') AS marker")).recordset[0]?.marker;
    if (hasMarker) {
      const rows = (await query('SELECT version FROM dbo.shopstream_bootstrap')).recordset;
      if (rows.length !== 1 || rows[0].version !== VERSION) {
        throw new Error('Existing bootstrap marker is missing or unsupported; refusing to modify an unverified database');
      }
      const catalog = (await query("SELECT OBJECT_ID(N'dbo.products', N'U') AS products, OBJECT_ID(N'dbo.categories', N'U') AS categories")).recordset[0];
      if (!catalog?.products || !catalog?.categories) throw new Error('Bootstrap marker exists but the catalog tables are missing');
      await tx.commit();
      console.log(`Catalog version ${VERSION} already installed; no data changed`);
      return false;
    }
    const existing = (await query(`
      SELECT CONCAT(SCHEMA_NAME(schema_id), N'.', name) AS name FROM sys.objects WHERE is_ms_shipped = 0 AND parent_object_id = 0
      UNION ALL SELECT CONCAT(SCHEMA_NAME(schema_id), N'.', name) FROM sys.types WHERE is_user_defined = 1
      UNION ALL SELECT name FROM sys.triggers WHERE parent_class = 0 AND is_ms_shipped = 0
    `)).recordset;
    if (existing.length) throw new Error('Catalog bootstrap requires an empty dedicated database; existing user objects were found');
    await tx.request().batch(source('schema.sql'));
    await tx.request().batch(source('seed.sql'));
    await query('CREATE TABLE dbo.shopstream_bootstrap (version INT PRIMARY KEY, seeded_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME())');
    await tx.request().input('version', sql.Int, VERSION).query('INSERT INTO dbo.shopstream_bootstrap (version) VALUES (@version)');
    await tx.commit();
    console.log(`Installed catalog schema and synthetic seed version ${VERSION}; no runtime permissions granted`);
    return true;
  } catch (error) {
    if (!rolledBack) {
      try { await tx.rollback(); } catch (rollbackError) {
        console.error('Catalog bootstrap rollback failed:', rollbackError.code || rollbackError.name);
      }
    }
    throw error;
  }
}

async function main(env = process.env) {
  if (process.argv[2] !== 'bootstrap') throw new Error('Use bootstrap');
  if (env.ENTRA_CREDENTIAL !== 'default') throw new Error('Catalog bootstrap requires ENTRA_CREDENTIAL=default with a local Entra SQL administrator');
  const config = createConfig(env);
  if (env.INVENTORY_CONFIRM_DATABASE !== config.database) throw new Error('Set INVENTORY_CONFIRM_DATABASE to the intended SQL_DATABASE before bootstrapping the catalog');
  const pool = new sql.ConnectionPool({ ...config, requestTimeout: 120000 });
  pool.on('error', error => console.error('Catalog bootstrap pool error:', error.code || error.name));
  try {
    await pool.connect();
    await bootstrap(pool);
  } finally { await pool.close(); }
}

if (require.main === module) main().catch(error => {
  for (const cause of [...(error.precedingErrors || []), error]) {
    console.error('Catalog bootstrap failed:', cause.code || cause.name, cause.message);
  }
  process.exitCode = 1;
});

module.exports = { bootstrap, VERSION };
