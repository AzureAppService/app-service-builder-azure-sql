-- ShopStream synthetic catalog: 525 fictional demonstration rows.
-- Ported from saurabh500/app-service-builder-postgresql@fa3aa915 db/seed.sql.
-- Run only through db/catalog/setup.js in an empty dedicated database.

-- Vendors (10)
INSERT INTO dbo.vendors (name, slug, email, description, logo_url, rating) VALUES
  (N'TechNova', N'technova', N'hello@technova.example.invalid', N'Premium consumer electronics and accessories', NULL, 4.7),
  (N'Urban Threads', N'urban-threads', N'info@urbanthreads.example.invalid', N'Streetwear and contemporary fashion', NULL, 4.5),
  (N'HomeHaven', N'homehaven', N'support@homehaven.example.invalid', N'Modern furniture and home decor', NULL, 4.6),
  (N'FitForge', N'fitforge', N'team@fitforge.example.invalid', N'Performance fitness equipment and gear', NULL, 4.4),
  (N'PureGlow', N'pureglow', N'care@pureglow.example.invalid', N'Clean beauty and skincare essentials', NULL, 4.8),
  (N'PageBound', N'pagebound', N'hello@pagebound.example.invalid', N'Curated books, stationery, and desk accessories', NULL, 4.3),
  (N'ByteGear', N'bytegear', N'sales@bytegear.example.invalid', N'Developer tools, peripherals, and workspace gear', NULL, 4.6),
  (N'GreenRoot', N'greenroot', N'hello@greenroot.example.invalid', N'Sustainable living products and eco-friendly goods', NULL, 4.5),
  (N'LittleLeap', N'littleleap', N'hi@littleleap.example.invalid', N'Educational toys and kids development products', NULL, 4.2),
  (N'TrailEdge', N'trailedge', N'adventure@trailedge.example.invalid', N'Outdoor adventure and camping equipment', NULL, 4.4);

-- Categories (15)
INSERT INTO dbo.categories (name, slug, parent_id, icon) VALUES
  (N'Electronics', N'electronics', NULL, N'🔌'),
  (N'Clothing', N'clothing', NULL, N'👕'),
  (N'Home & Garden', N'home-garden', NULL, N'🏠'),
  (N'Sports & Fitness', N'sports-fitness', NULL, N'🏋️'),
  (N'Beauty', N'beauty', NULL, N'✨'),
  (N'Books & Office', N'books-office', NULL, N'📚'),
  (N'Phones & Tablets', N'phones-tablets', 1, N'📱'),
  (N'Laptops & PCs', N'laptops-pcs', 1, N'💻'),
  (N'Audio', N'audio', 1, N'🎧'),
  (N'Men''s Fashion', N'mens-fashion', 2, N'👔'),
  (N'Women''s Fashion', N'womens-fashion', 2, N'👗'),
  (N'Furniture', N'furniture', 3, N'🛋️'),
  (N'Kitchen', N'kitchen', 3, N'🍳'),
  (N'Outdoor Gear', N'outdoor-gear', 4, N'⛺'),
  (N'Skincare', N'skincare', 5, N'🧴');

-- Products (500) via GENERATE_SERIES (compatibility level 160)
INSERT INTO dbo.products (vendor_id, category_id, name, slug, description, price_cents, compare_price_cents, sku, stock_qty, is_active, rating_avg, review_count, created_at)
SELECT
  (i % 10) + 1 AS vendor_id,
  (i % 15) + 1 AS category_id,
  CHOOSE((i % 20) + 1,
    N'Pro', N'Ultra', N'Elite', N'Essential', N'Classic', N'Nano', N'Max', N'Lite', N'Prime', N'Core',
    N'Studio', N'Edge', N'Flex', N'Swift', N'Zen', N'Bold', N'Pure', N'Apex', N'Nova', N'Spark'
  ) + N' ' +
  CHOOSE((i % 50) + 1,
    N'Wireless Headphones', N'Running Shoes', N'Desk Lamp', N'Backpack', N'Water Bottle',
    N'Phone Case', N'Yoga Mat', N'Coffee Maker', N'Notebook', N'Sunglasses',
    N'Keyboard', N'T-Shirt', N'Face Cream', N'Camping Tent', N'Wall Art',
    N'Smart Watch', N'Sneakers', N'Throw Pillow', N'Resistance Bands', N'Lip Balm',
    N'Monitor Stand', N'Hoodie', N'Candle Set', N'Dumbbell Set', N'Serum',
    N'USB-C Hub', N'Jacket', N'Plant Pot', N'Jump Rope', N'Tote Bag',
    N'Webcam', N'Joggers', N'Bookshelf', N'Foam Roller', N'Moisturizer',
    N'Power Bank', N'Beanie', N'Table Runner', N'Kettlebell', N'Cleanser',
    N'Desk Mat', N'Polo Shirt', N'Door Mat', N'Ab Wheel', N'Hair Oil',
    N'Charger Cable', N'Scarf', N'Mirror', N'Pull-Up Bar', N'Eye Cream'
  ) AS name,
  CONCAT(N'product-', i) AS slug,
  N'High-quality product crafted with care. Perfect for everyday use.' AS description,
  (1000 + (i * 137) % 15000) AS price_cents,
  CASE WHEN i % 3 = 0 THEN (1500 + (i * 137) % 20000) ELSE NULL END AS compare_price_cents,
  N'SKU-' + RIGHT(N'000000' + CAST(i AS VARCHAR(6)), 6) AS sku,
  (5 + (i * 7) % 200) AS stock_qty,
  1 AS is_active,
  (30 + (i * 13) % 20) / 10.0 AS rating_avg,
  (i * 3) % 50 AS review_count,
  DATEADD(day, -(i % 365), SYSUTCDATETIME())
FROM (SELECT value AS i FROM GENERATE_SERIES(1, 500)) AS s;
