-- PostgreSQL schema for Practical Work #4: TechHome service ordering system

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  full_name VARCHAR(150) NOT NULL DEFAULT 'Пользователь',
  phone VARCHAR(30) NOT NULL DEFAULT '',
  default_address VARCHAR(255) NOT NULL DEFAULT '',
  personal_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (personal_discount_percent BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  service_code VARCHAR(30) UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  brand VARCHAR(100),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  stock INTEGER NOT NULL DEFAULT 999 CHECK (stock >= 0),
  image TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_address VARCHAR(255) NOT NULL DEFAULT '',
  delivery_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'created',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  review_code VARCHAR(30) UNIQUE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL CHECK (length(trim(comment)) BETWEEN 3 AND 1000),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles(name) VALUES ('admin'), ('user') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories(name) VALUES
  ('Компьютеры'), ('Сети'), ('Телевизоры'), ('Безопасность')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products(category_id, service_code, name, description, brand, price, duration_minutes, discount_percent, stock)
SELECT c.id, 'SVC-0001', 'Установка и настройка компьютера', 'Установка программ, настройка системы и основных параметров компьютера.', 'TechHome', 3500, 120, 0, 999
FROM categories c WHERE c.name='Компьютеры' AND NOT EXISTS (SELECT 1 FROM products WHERE service_code='SVC-0001');
INSERT INTO products(category_id, service_code, name, description, brand, price, duration_minutes, discount_percent, stock)
SELECT c.id, 'SVC-0002', 'Настройка Wi-Fi роутера', 'Подключение роутера, настройка сети Wi-Fi и проверка соединения.', 'TechHome', 1800, 60, 0, 999
FROM categories c WHERE c.name='Сети' AND NOT EXISTS (SELECT 1 FROM products WHERE service_code='SVC-0002');
INSERT INTO products(category_id, service_code, name, description, brand, price, duration_minutes, discount_percent, stock)
SELECT c.id, 'SVC-0003', 'Установка Windows', 'Установка операционной системы, драйверов и базовых программ.', 'TechHome', 3000, 120, 10, 999
FROM categories c WHERE c.name='Компьютеры' AND NOT EXISTS (SELECT 1 FROM products WHERE service_code='SVC-0003');
INSERT INTO products(category_id, service_code, name, description, brand, price, duration_minutes, discount_percent, stock)
SELECT c.id, 'SVC-0004', 'Установка телевизора', 'Монтаж телевизора, подключение оборудования и базовая настройка.', 'TechHome', 2500, 90, 0, 999
FROM categories c WHERE c.name='Телевизоры' AND NOT EXISTS (SELECT 1 FROM products WHERE service_code='SVC-0004');
INSERT INTO products(category_id, service_code, name, description, brand, price, duration_minutes, discount_percent, stock)
SELECT c.id, 'SVC-0005', 'Установка камеры видеонаблюдения', 'Монтаж камеры, подключение и базовая настройка системы наблюдения.', 'TechHome', 4500, 150, 15, 999
FROM categories c WHERE c.name='Безопасность' AND NOT EXISTS (SELECT 1 FROM products WHERE service_code='SVC-0005');

UPDATE products SET service_code = 'SVC-' || LPAD(id::text, 4, '0') WHERE service_code IS NULL;
UPDATE products SET duration_minutes = 60 WHERE duration_minutes IS NULL;
UPDATE products SET stock = 999 WHERE stock IS NULL;
UPDATE reviews SET review_code = 'REV-' || LPAD(id::text, 6, '0') WHERE review_code IS NULL;
