-- ShopStream catalog schema used by DAB and the inventory foreign keys.
-- Ported from saurabh500/app-service-builder-postgresql@fa3aa915 db/schema.sql,
-- limited to the catalog tables. Run only through db/catalog/setup.js.

CREATE TABLE dbo.vendors (
  id            INT IDENTITY(1,1) PRIMARY KEY,
  name          NVARCHAR(200) NOT NULL,
  slug          NVARCHAR(200) NOT NULL UNIQUE,
  email         NVARCHAR(255) NOT NULL,
  description   NVARCHAR(MAX),
  logo_url      NVARCHAR(500),
  rating        NUMERIC(3,2) DEFAULT 0,
  created_at    DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.categories (
  id            INT IDENTITY(1,1) PRIMARY KEY,
  name          NVARCHAR(100) NOT NULL,
  slug          NVARCHAR(100) NOT NULL UNIQUE,
  parent_id     INTEGER REFERENCES dbo.categories(id),
  icon          NVARCHAR(10)
);

CREATE TABLE dbo.products (
  id                  INT IDENTITY(1,1) PRIMARY KEY,
  vendor_id           INTEGER NOT NULL REFERENCES dbo.vendors(id),
  category_id         INTEGER NOT NULL REFERENCES dbo.categories(id),
  name                NVARCHAR(300) NOT NULL,
  slug                NVARCHAR(300) NOT NULL,
  description         NVARCHAR(MAX),
  price_cents         INTEGER NOT NULL,
  compare_price_cents INTEGER,
  sku                 NVARCHAR(50),
  image_url           NVARCHAR(500),
  stock_qty           INTEGER NOT NULL DEFAULT 0,
  is_active           BIT DEFAULT 1,
  rating_avg          NUMERIC(3,2) DEFAULT 0,
  review_count        INTEGER DEFAULT 0,
  created_at          DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at          DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE INDEX idx_products_vendor ON dbo.products(vendor_id);
CREATE INDEX idx_products_category ON dbo.products(category_id);
CREATE INDEX idx_products_created ON dbo.products(created_at);
CREATE INDEX idx_products_active ON dbo.products(is_active) WHERE is_active = 1;
