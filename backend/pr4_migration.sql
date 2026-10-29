-- Практическая работа №4: расширение проекта до информационной системы заказа услуг

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150) NOT NULL DEFAULT 'Пользователь';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_address VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE products ADD COLUMN IF NOT EXISTS service_code VARCHAR(30);
ALTER TABLE products ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0);

UPDATE products
SET service_code = 'SVC-' || LPAD(id::text, 4, '0')
WHERE service_code IS NULL;

INSERT INTO categories(name) VALUES ('Компьютеры'), ('Сети'), ('Телевизоры'), ('Безопасность') ON CONFLICT (name) DO NOTHING;

UPDATE products SET category_id=(SELECT id FROM categories WHERE name='Компьютеры') WHERE service_code IN ('SVC-0001','SVC-0003');
UPDATE products SET category_id=(SELECT id FROM categories WHERE name='Сети') WHERE service_code='SVC-0002';
UPDATE products SET category_id=(SELECT id FROM categories WHERE name='Телевизоры') WHERE service_code='SVC-0004';
UPDATE products SET category_id=(SELECT id FROM categories WHERE name='Безопасность') WHERE service_code='SVC-0005';

ALTER TABLE products ALTER COLUMN service_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_service_code_uq ON products(service_code);

UPDATE products SET name='Установка и настройка компьютера', description='Установка программ, настройка системы и основных параметров компьютера.', brand='TechHome', duration_minutes=120 WHERE name='Наушники';
UPDATE products SET name='Настройка Wi-Fi роутера', description='Подключение роутера, настройка сети Wi-Fi и проверка соединения.', brand='TechHome', duration_minutes=60 WHERE name='Мышка';
UPDATE products SET name='Установка Windows', description='Установка операционной системы, драйверов и базовых программ.', brand='TechHome', duration_minutes=120 WHERE name='Клавиатура';
UPDATE products SET name='Установка телевизора', description='Монтаж телевизора, подключение оборудования и базовая настройка.', brand='TechHome', duration_minutes=90 WHERE name='Монитор';
UPDATE products SET name='Установка камеры видеонаблюдения', description='Монтаж камеры, подключение и базовая настройка системы наблюдения.', brand='TechHome', duration_minutes=150 WHERE name='Веб-камера';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE;

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  review_code VARCHAR(30) UNIQUE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL CHECK (length(trim(comment)) BETWEEN 3 AND 1000),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

UPDATE reviews SET review_code = 'REV-' || LPAD(id::text, 6, '0') WHERE review_code IS NULL;
ALTER TABLE reviews ALTER COLUMN review_code SET NOT NULL;

-- Индексы для частых JOIN/фильтраций
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Убираем старые демо-скидки, чтобы скидка была частью логики Практической №4.
UPDATE products SET discount_percent = 0 WHERE discount_percent IS NULL;
