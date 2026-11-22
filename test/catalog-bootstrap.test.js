const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { bootstrap } = require('../db/catalog/setup');

function fakePool({ level = 160, tables = [] } = {}) {
  const state = { level, tables: [...tables], marker: null, batches: [], commits: 0, rollbacks: 0, failSeed: false };
  return {
    state,
    transaction() {
      const pending = { batches: [], marker: null };
      return {
        on() {}, async begin() {},
        async commit() {
          state.commits++;
          state.batches.push(...pending.batches);
          if (pending.marker !== null) { state.marker = pending.marker; state.tables.push('vendors', 'categories', 'products', 'shopstream_bootstrap'); }
        },
        async rollback() { state.rollbacks++; },
        request() {
          const parameters = {};
          return {
            input(name, type, value) { parameters[name] = value; return this; },
            async batch(text) {
              if (state.failSeed && text.includes('INSERT INTO dbo.products')) throw new Error('seed failed');
              pending.batches.push(text);
              return { recordset: [] };
            },
            async query(text) {
              if (text.includes('compatibility_level')) return { recordset: [{ compatibility_level: state.level }] };
              if (text.includes("OBJECT_ID(N'dbo.shopstream_bootstrap'")) return { recordset: [{ marker: state.marker === null ? null : 1 }] };
              if (text.startsWith('SELECT version FROM dbo.shopstream_bootstrap')) return { recordset: state.marker === null ? [] : [{ version: state.marker }] };
              if (text.includes("OBJECT_ID(N'dbo.products'")) return { recordset: [{ products: state.tables.includes('products') ? 1 : null, categories: state.tables.includes('categories') ? 2 : null }] };
              if (text.includes('FROM sys.tables')) return { recordset: state.tables.map(name => ({ name })) };
              if (text.startsWith('INSERT INTO dbo.shopstream_bootstrap')) pending.marker = parameters.version;
              return { recordset: [] };
            },
          };
        },
      };
    },
  };
}

test('catalog bootstrap installs schema and seed once, then is a no-op', async () => {
  const pool = fakePool();
  assert.equal(await bootstrap(pool), true);
  assert.equal(pool.state.marker, 1);
  assert.equal(pool.state.batches.length, 2);
  assert.ok(pool.state.batches[0].includes('CREATE TABLE dbo.products'));
  assert.equal(await bootstrap(pool), false);
  assert.equal(pool.state.batches.length, 2);
  assert.equal(pool.state.commits, 2);
});

test('catalog bootstrap refuses non-empty, low-compatibility or unverified databases without changes', async () => {
  for (const [pool, pattern] of [
    [fakePool({ tables: ['orders'] }), /empty dedicated database/],
    [fakePool({ level: 150 }), /compatibility level/],
  ]) {
    await assert.rejects(bootstrap(pool), pattern);
    assert.deepEqual(pool.state.batches, []);
    assert.equal(pool.state.rollbacks, 1);
  }
  const marked = fakePool();
  marked.state.marker = 2;
  await assert.rejects(bootstrap(marked), /unsupported/);
  const missing = fakePool();
  missing.state.marker = 1;
  await assert.rejects(bootstrap(missing), /catalog tables are missing/);
});

test('a failed seed rolls back without recording the version marker', async () => {
  const pool = fakePool();
  pool.state.failSeed = true;
  await assert.rejects(bootstrap(pool), /seed failed/);
  assert.equal(pool.state.marker, null);
  assert.equal(pool.state.rollbacks, 1);
  assert.equal(pool.state.commits, 0);
});

test('catalog SQL creates only catalog tables, grants nothing and seeds synthetic data', () => {
  const read = name => fs.readFileSync(path.join(__dirname, '../db/catalog', name), 'utf8');
  const schema = read('schema.sql');
  const seed = read('seed.sql');
  assert.deepEqual([...schema.matchAll(/CREATE TABLE (\S+)/g)].map(m => m[1]), ['dbo.vendors', 'dbo.categories', 'dbo.products']);
  assert.deepEqual([...new Set([...seed.matchAll(/INSERT INTO (\S+)/g)].map(m => m[1]))], ['dbo.vendors', 'dbo.categories', 'dbo.products']);
  for (const text of [schema, seed]) assert.doesNotMatch(text, /\b(GRANT|DROP|DELETE|TRUNCATE|CREATE USER)\b/i);
  for (const [, email] of seed.matchAll(/N'([^']+@[^']+)'/g)) assert.match(email, /\.example\.invalid$/);
});
