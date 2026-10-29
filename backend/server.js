
import express from 'express';

import cors from 'cors';

import dotenv from 'dotenv';

import bcrypt from 'bcryptjs';

import jwt from 'jsonwebtoken';

import pg from 'pg';

const { Pool } = pg;

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

const pool = new Pool({

host: process.env.PG_HOST,

port: Number(process.env.PG_PORT || 5432),

database: process.env.PG_DATABASE,

user: process.env.PG_USER,

password: process.env.PG_PASSWORD,

});

let dbReady = false;

async function setupDatabase() {

try {

await pool.query('SELECT 1');

await pool.query(`

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150) NOT NULL DEFAULT 'Пользователь';

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NOT NULL DEFAULT '';

ALTER TABLE users ADD COLUMN IF NOT EXISTS default_address VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE products ADD COLUMN IF NOT EXISTS service_code VARCHAR(30);

ALTER TABLE products ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60;

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

UPDATE products SET service_code = 'SVC-' || LPAD(id::text, 4, '0') WHERE service_code IS NULL;

UPDATE products SET category_id=(SELECT id FROM categories WHERE name='Компьютеры') WHERE service_code IN ('SVC-0001','SVC-0003');

UPDATE products SET category_id=(SELECT id FROM categories WHERE name='Сети') WHERE service_code='SVC-0002';

UPDATE products SET category_id=(SELECT id FROM categories WHERE name='Телевизоры') WHERE service_code='SVC-0004';

UPDATE products SET category_id=(SELECT id FROM categories WHERE name='Безопасность') WHERE service_code='SVC-0005';

UPDATE reviews SET review_code = 'REV-' || LPAD(id::text, 6, '0') WHERE review_code IS NULL;

`);

await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS products_service_code_uq ON products(service_code)');

await pool.query('ALTER TABLE products ALTER COLUMN service_code SET NOT NULL');

await pool.query('ALTER TABLE reviews ALTER COLUMN review_code SET NOT NULL');

await pool.query("INSERT INTO roles(name) VALUES ('admin'), ('user') ON CONFLICT (name) DO NOTHING");

await pool.query(`INSERT INTO categories(name) VALUES ('Компьютеры'), ('Сети'), ('Телевизоры'), ('Безопасность') ON CONFLICT (name) DO NOTHING`);

await pool.query(`

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

`);

const adminRole = await pool.query("SELECT id FROM roles WHERE name='admin'");

if (adminRole.rows[0]) {

const adminExists = await pool.query("SELECT id FROM users WHERE role_id=$1 LIMIT 1", [adminRole.rows[0].id]);

if (!adminExists.rows[0]) {

const hash = await bcrypt.hash('admin123', 10);

await pool.query(`INSERT INTO users(email,password_hash,role_id,full_name,phone,default_address,personal_discount_percent)

VALUES ('admin@example.com',$1,$2,'Администратор','+70000000000','',0)`, [hash, adminRole.rows[0].id]);

}

}

dbReady = true;

} catch (error) {

dbReady = false;

console.error('Database setup error:', error.message);

}

}

setupDatabase();

function auth(required = true) {

return (req, res, next) => {

const header = req.headers.authorization;

if (!header) return required ? res.status(401).json({ message: 'Требуется авторизация' }) : next();

try {

req.user = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET || 'change_me');

next();

} catch {

return res.status(401).json({ message: 'Недействительный токен' });

}

};

}

function adminOnly(req, res, next) {

if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Доступ только для администратора' });

next();

}

function validateEmail(email) {

return /^\S+@\S+\.\S+$/.test(String(email || '').trim());

}

function publicUser(row) {

return {

email: row.email,

role: row.role,

full_name: row.full_name,

phone: row.phone,

default_address: row.default_address,

personal_discount_percent: Number(row.personal_discount_percent || 0),

};

}

async function getUserById(id) {

const result = await pool.query(`

SELECT u.id,u.email,u.password_hash,u.full_name,u.phone,u.default_address,u.personal_discount_percent,r.name AS role

FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1

`, [id]);

return result.rows[0];

}

app.get('/api/health', (req, res) => res.json({ ok: true, database: dbReady ? 'connected' : 'not_connected' }));

app.get('/api/categories', async (req, res, next) => {

try {

const result = await pool.query(`SELECT c.name, COUNT(p.id)::int AS service_count FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id,c.name HAVING COUNT(p.id)>0 ORDER BY c.name`);

res.json({ categories: result.rows });

} catch (error) { next(error); }

});

app.get('/api/services', async (req, res, next) => {

try {

const { category, max_price } = req.query;

const params = [];

const where = [];

if (category) { params.push(category); where.push(`c.name=$${params.length}`); }

if (max_price) { const value = Number(max_price); if (!Number.isFinite(value) || value < 0) return res.status(400).json({ message: 'Некорректная максимальная цена' }); params.push(value); where.push(`p.price <= $${params.length}`); }

const result = await pool.query(`

SELECT p.service_code, p.name, p.description, p.brand, p.price, p.duration_minutes,

p.discount_percent, c.name AS category_name,

COALESCE(ROUND(AVG(r.rating),1),0) AS rating, COUNT(r.id)::int AS review_count

FROM products p

JOIN categories c ON c.id=p.category_id

LEFT JOIN reviews r ON r.product_id=p.id

${where.length ? 'WHERE ' + where.join(' AND ') : ''}

GROUP BY p.id,c.name ORDER BY p.id

`, params);

res.json({ services: result.rows });

} catch (error) { next(error); }

});

app.get('/api/services/:code', async (req, res, next) => {

try {

const service = await pool.query(`

SELECT p.service_code,p.name,p.description,p.brand,p.price,p.duration_minutes,p.discount_percent,c.name AS category_name,

COALESCE(ROUND(AVG(r.rating),1),0) AS rating,COUNT(r.id)::int AS review_count

FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN reviews r ON r.product_id=p.id

WHERE p.service_code=$1 GROUP BY p.id,c.name

`, [req.params.code]);

if (!service.rows[0]) return res.status(404).json({ message: 'Услуга не найдена' });

const reviews = await pool.query(`

SELECT r.review_code,r.rating,r.comment,r.created_at,u.full_name

FROM reviews r JOIN users u ON u.id=r.user_id JOIN products p ON p.id=r.product_id

WHERE p.service_code=$1 ORDER BY r.created_at DESC

`, [req.params.code]);

res.json({ service: service.rows[0], reviews: reviews.rows });

} catch (error) { next(error); }

});

app.post('/api/auth/login', async (req,res,next) => {

try {

const email=String(req.body.email||'').trim().toLowerCase(); const password=String(req.body.password||'');

if(!email||!password) return res.status(400).json({message:'Заполните email и пароль'});

if(!validateEmail(email)) return res.status(400).json({message:'Введите корректный email'});

const found=await pool.query(`SELECT u.*,r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE lower(u.email)=lower($1)`,[email]);

if(!found.rows[0]||!(await bcrypt.compare(password,found.rows[0].password_hash))) return res.status(401).json({message:'Неверный email или пароль'});

const user=publicUser(found.rows[0]);

const token=jwt.sign({id:found.rows[0].id,email:found.rows[0].email,role:found.rows[0].role},process.env.JWT_SECRET||'change_me',{expiresIn:'7d'});

res.json({token,user});

} catch(error){next(error);}

});

app.post('/api/auth/register', async (req,res,next) => {

try {

const fullName=String(req.body.full_name||'').trim(); const email=String(req.body.email||'').trim().toLowerCase(); const password=String(req.body.password||''); const phone=String(req.body.phone||'').trim();

if(!fullName||!email||!password||!phone) return res.status(400).json({message:'Заполните все обязательные поля'});

if(fullName.length<2) return res.status(400).json({message:'Введите корректное ФИО'});

if(!validateEmail(email)) return res.status(400).json({message:'Введите корректный email'});

if(password.length<6) return res.status(400).json({message:'Пароль должен содержать минимум 6 символов'});

if(!/^\+?[0-9 ()-]{10,20}$/.test(phone)) return res.status(400).json({message:'Введите корректный телефон'});

const existing=await pool.query('SELECT id FROM users WHERE lower(email)=lower($1)',[email]);

if(existing.rows[0]) return res.status(409).json({message:'Пользователь с таким email уже существует'});

const role=await pool.query("SELECT id FROM roles WHERE name='user'"); const hash=await bcrypt.hash(password,10);

const result=await pool.query(`INSERT INTO users(email,password_hash,role_id,full_name,phone,default_address,personal_discount_percent) VALUES($1,$2,$3,$4,$5,'',0) RETURNING id,email,full_name,phone,default_address,personal_discount_percent`,[email,hash,role.rows[0].id,fullName,phone]);

const row={...result.rows[0],role:'user'}; const token=jwt.sign({id:row.id,email:row.email,role:'user'},process.env.JWT_SECRET||'change_me',{expiresIn:'7d'});

res.status(201).json({message:'Регистрация успешно выполнена',token,user:publicUser(row)});

} catch(error){next(error);}

});

app.post('/api/auth/forgot-password', async(req,res,next)=>{

try{

const email=String(req.body.email||'').trim().toLowerCase(); const phone=String(req.body.phone||'').trim(); const newPassword=String(req.body.new_password||'');

if(!email||!phone||!newPassword) return res.status(400).json({message:'Заполните все поля'});

if(!validateEmail(email)) return res.status(400).json({message:'Введите корректный email'});

if(newPassword.length<6) return res.status(400).json({message:'Новый пароль должен содержать минимум 6 символов'});

const result=await pool.query('SELECT id FROM users WHERE lower(email)=lower($1) AND phone=$2',[email,phone]);

if(!result.rows[0]) return res.status(400).json({message:'Пользователь с таким email и телефоном не найден'});

const hash=await bcrypt.hash(newPassword,10); await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2',[hash,result.rows[0].id]);

res.json({message:'Пароль успешно изменён'});

}catch(error){next(error);}

});

app.get('/api/auth/me',auth(),async(req,res,next)=>{try{const row=await getUserById(req.user.id);if(!row)return res.status(404).json({message:'Пользователь не найден'});res.json({user:publicUser(row)});}catch(error){next(error);}});

app.put('/api/profile',auth(),async(req,res,next)=>{

try{

const fullName=String(req.body.full_name||'').trim(); const email=String(req.body.email||'').trim().toLowerCase(); const phone=String(req.body.phone||'').trim(); const address=String(req.body.default_address||'').trim();

if(!fullName||!email||!phone) return res.status(400).json({message:'ФИО, email и телефон обязательны'});

if(!validateEmail(email)) return res.status(400).json({message:'Введите корректный email'});

if(!/^\+?[0-9 ()-]{10,20}$/.test(phone)) return res.status(400).json({message:'Введите корректный телефон'});

const duplicate=await pool.query('SELECT id FROM users WHERE lower(email)=lower($1) AND id<>$2',[email,req.user.id]); if(duplicate.rows[0]) return res.status(409).json({message:'Этот email уже используется'});

await pool.query('UPDATE users SET full_name=$1,email=$2,phone=$3,default_address=$4 WHERE id=$5',[fullName,email,phone,address,req.user.id]);

const row=await getUserById(req.user.id); res.json({user:publicUser(row)});

}catch(error){next(error);}

});

app.put('/api/profile/password',auth(),async(req,res,next)=>{try{const current=String(req.body.current_password||'');const nextPassword=String(req.body.new_password||'');if(!current||!nextPassword)return res.status(400).json({message:'Заполните оба пароля'});if(nextPassword.length<6)return res.status(400).json({message:'Новый пароль должен содержать минимум 6 символов'});const row=await getUserById(req.user.id);if(!await bcrypt.compare(current,row.password_hash))return res.status(400).json({message:'Текущий пароль указан неверно'});const hash=await bcrypt.hash(nextPassword,10);await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2',[hash,req.user.id]);res.json({message:'Пароль изменён'});}catch(error){next(error);}});

app.get('/api/cart',auth(),async(req,res,next)=>{try{const result=await pool.query(`SELECT ci.quantity,p.service_code,p.name,p.description,p.brand,p.price,p.discount_percent,p.duration_minutes,c.name AS category_name FROM cart_items ci JOIN products p ON p.id=ci.product_id JOIN categories c ON c.id=p.category_id WHERE ci.user_id=$1 ORDER BY ci.id`,[req.user.id]);res.json({items:result.rows});}catch(error){next(error);}});

async function findServiceByCode(code){const result=await pool.query('SELECT id,service_code,stock,price,discount_percent FROM products WHERE service_code=$1',[code]);return result.rows[0];}

app.post('/api/cart/items',auth(),async(req,res,next)=>{try{const code=String(req.body.service_code||'').trim();const quantity=Number(req.body.quantity??1);if(!code||!Number.isInteger(quantity)||quantity<=0)return res.status(400).json({message:'Некорректные данные корзины'});const service=await findServiceByCode(code);if(!service)return res.status(404).json({message:'Услуга не найдена'});const current=await pool.query('SELECT quantity FROM cart_items WHERE user_id=$1 AND product_id=$2',[req.user.id,service.id]);const newQty=(current.rows[0]?.quantity||0)+quantity;if(service.stock<newQty)return res.status(400).json({message:'Невозможно добавить больше доступного количества'});await pool.query(`INSERT INTO cart_items(user_id,product_id,quantity) VALUES($1,$2,$3) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity`,[req.user.id,service.id,newQty]);res.status(201).json({message:'Услуга добавлена в корзину'});}catch(error){next(error);}});

app.patch('/api/cart/items/:code',auth(),async(req,res,next)=>{try{const code=req.params.code;const quantity=Number(req.body.quantity);if(!Number.isInteger(quantity)||quantity<=0)return res.status(400).json({message:'Количество должно быть больше 0'});const service=await findServiceByCode(code);if(!service)return res.status(404).json({message:'Услуга не найдена'});if(service.stock<quantity)return res.status(400).json({message:'Количество превышает доступное'});const result=await pool.query('UPDATE cart_items SET quantity=$1 WHERE user_id=$2 AND product_id=$3',[quantity,req.user.id,service.id]);if(!result.rowCount)return res.status(404).json({message:'Услуга не найдена в корзине'});res.json({message:'Количество обновлено'});}catch(error){next(error);}});

app.delete('/api/cart/items/:code',auth(),async(req,res,next)=>{try{const service=await findServiceByCode(req.params.code);if(!service)return res.status(404).json({message:'Услуга не найдена'});const result=await pool.query('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2',[req.user.id,service.id]);if(!result.rowCount)return res.status(404).json({message:'Услуга не найдена в корзине'});res.json({message:'Услуга удалена из корзины'});}catch(error){next(error);}});

app.delete('/api/cart',auth(),async(req,res,next)=>{try{await pool.query('DELETE FROM cart_items WHERE user_id=$1',[req.user.id]);res.json({message:'Корзина очищена'});}catch(error){next(error);}});

app.post('/api/orders',auth(),async(req,res,next)=>{

const client=await pool.connect();

try{

const address=String(req.body.delivery_address||'').trim(); const date=String(req.body.delivery_date||'');

if(!address)return res.status(400).json({message:'Введите адрес доставки'});

if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return res.status(400).json({message:'Укажите дату доставки'});

const today=new Date();today.setHours(0,0,0,0);const selected=new Date(`${date}T00:00:00`);if(selected<today)return res.status(400).json({message:'Дата доставки не может быть раньше текущей даты'});

await client.query('BEGIN');

const cart=await client.query(`SELECT ci.quantity,p.id,p.service_code,p.price,p.discount_percent,u.personal_discount_percent FROM cart_items ci JOIN products p ON p.id=ci.product_id JOIN users u ON u.id=ci.user_id WHERE ci.user_id=$1`,[req.user.id]);

if(!cart.rows.length){await client.query('ROLLBACK');return res.status(400).json({message:'Корзина пуста'});}

let total=0;for(const item of cart.rows){const discount=Math.max(Number(item.discount_percent)||0,Number(item.personal_discount_percent)||0);total+=Number(item.price)*(1-discount/100)*item.quantity;}

const order=await client.query('INSERT INTO orders(user_id,total_amount,delivery_address,delivery_date,status) VALUES($1,$2,$3,$4,\'created\') RETURNING id,total_amount,delivery_address,delivery_date,status,created_at',[req.user.id,total,address,date]);

for(const item of cart.rows){const discount=Math.max(Number(item.discount_percent)||0,Number(item.personal_discount_percent)||0);const unit=Number(item.price)*(1-discount/100);await client.query('INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)',[order.rows[0].id,item.id,item.quantity,unit]);}

await client.query('INSERT INTO payments(order_id,amount,status) VALUES($1,$2,\'pending\')',[order.rows[0].id,total]);

await client.query('DELETE FROM cart_items WHERE user_id=$1',[req.user.id]);

await client.query('COMMIT');

res.status(201).json({message:'Заказ оформлен',order:order.rows[0]});

}catch(error){await client.query('ROLLBACK').catch(()=>{});next(error);}finally{client.release();}

});

app.get('/api/orders',auth(),async(req,res,next)=>{try{const result=await pool.query(`SELECT 'ORD-'||LPAD(o.id::text,6,'0') AS order_number,o.total_amount,o.delivery_address,o.delivery_date,o.status,o.created_at,COUNT(oi.id)::int AS item_count FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC`,[req.user.id]);res.json({orders:result.rows});}catch(error){next(error);}});

app.post('/api/services/:code/reviews', auth(), async (req, res, next) => {
  try {
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: 'Оценка должна быть от 1 до 5'
      });
    }

    if (comment.length < 3 || comment.length > 1000) {
      return res.status(400).json({
        message: 'Комментарий должен содержать от 3 до 1000 символов'
      });
    }

    const service = await findServiceByCode(req.params.code);

    if (!service) {
      return res.status(404).json({
        message: 'Услуга не найдена'
      });
    }

    const reviewCode = `REV-${Date.now()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;

    const review = await pool.query(
      `
        INSERT INTO reviews(
          review_code,
          product_id,
          user_id,
          rating,
          comment
        )
        VALUES($1, $2, $3, $4, $5)
        RETURNING review_code, rating, comment, created_at
      `,
      [
        reviewCode,
        service.id,
        req.user.id,
        rating,
        comment
      ]
    );

    res.status(201).json({
      review: review.rows[0]
    });

  } catch (error) {
    next(error);
  }
});
app.get('/api/admin/services',auth(),adminOnly,async(req,res,next)=>{try{const result=await pool.query(`SELECT p.service_code,p.name,p.description,p.price,p.duration_minutes,p.discount_percent,c.name AS category_name FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.id`);res.json({services:result.rows});}catch(error){next(error);}});

app.post('/api/admin/services',auth(),adminOnly,async(req,res,next)=>{try{const {name,description,price,duration_minutes,category_name}=req.body;const priceNum=Number(price),duration=Number(duration_minutes);if(!String(name||'').trim()||!String(description||'').trim()||!String(category_name||'').trim())return res.status(400).json({message:'Заполните обязательные поля услуги'});if(!Number.isFinite(priceNum)||priceNum<0)return res.status(400).json({message:'Цена должна быть неотрицательной'});if(!Number.isInteger(duration)||duration<=0)return res.status(400).json({message:'Длительность должна быть положительной'});const cat=await pool.query('SELECT id FROM categories WHERE name=$1',[category_name]);if(!cat.rows[0])return res.status(400).json({message:'Категория не найдена'});const code='SVC-'+String(Date.now()).slice(-8);const result=await pool.query(`INSERT INTO products(service_code,name,description,brand,price,duration_minutes,discount_percent,stock,category_id) VALUES($1,$2,$3,'TechHome',$4,$5,0,999,$6) RETURNING service_code,name,description,price,duration_minutes,discount_percent`,[code,String(name).trim(),String(description).trim(),priceNum,duration,cat.rows[0].id]);res.status(201).json({service:result.rows[0]});}catch(error){next(error);}});

app.put('/api/admin/services/:code',auth(),adminOnly,async(req,res,next)=>{try{const {name,description,price,duration_minutes,category_name,discount_percent}=req.body;const priceNum=Number(price),duration=Number(duration_minutes),discount=Number(discount_percent||0);if(!String(name||'').trim()||!String(description||'').trim())return res.status(400).json({message:'Название и описание обязательны'});if(!Number.isFinite(priceNum)||priceNum<0||!Number.isInteger(duration)||duration<=0||!Number.isFinite(discount)||discount<0||discount>100)return res.status(400).json({message:'Некорректные данные услуги'});const cat=await pool.query('SELECT id FROM categories WHERE name=$1',[category_name]);if(!cat.rows[0])return res.status(400).json({message:'Категория не найдена'});const result=await pool.query(`UPDATE products SET name=$1,description=$2,price=$3,duration_minutes=$4,discount_percent=$5,category_id=$6 WHERE service_code=$7 RETURNING service_code,name,description,price,duration_minutes,discount_percent`,[name.trim(),description.trim(),priceNum,duration,discount,cat.rows[0].id,req.params.code]);if(!result.rows[0])return res.status(404).json({message:'Услуга не найдена'});res.json({service:result.rows[0]});}catch(error){next(error);}});

app.delete('/api/admin/services/:code',auth(),adminOnly,async(req,res,next)=>{try{const result=await pool.query('DELETE FROM products WHERE service_code=$1 RETURNING service_code',[req.params.code]);if(!result.rows[0])return res.status(404).json({message:'Услуга не найдена'});res.json({message:'Услуга удалена'});}catch(error){next(error);}});

app.post('/api/admin/categories',auth(),adminOnly,async(req,res,next)=>{try{const name=String(req.body.name||'').trim();if(name.length<2)return res.status(400).json({message:'Название категории слишком короткое'});const result=await pool.query('INSERT INTO categories(name) VALUES($1) RETURNING name',[name]);res.status(201).json({category:result.rows[0]});}catch(error){next(error);}});

app.put('/api/admin/categories/:name',auth(),adminOnly,async(req,res,next)=>{try{const nextName=String(req.body.name||'').trim();if(nextName.length<2)return res.status(400).json({message:'Название категории слишком короткое'});const result=await pool.query('UPDATE categories SET name=$1 WHERE name=$2 RETURNING name',[nextName,req.params.name]);if(!result.rows[0])return res.status(404).json({message:'Категория не найдена'});res.json({category:result.rows[0]});}catch(error){next(error);}});

app.delete('/api/admin/categories/:name',auth(),adminOnly,async(req,res,next)=>{try{const used=await pool.query('SELECT 1 FROM products p JOIN categories c ON c.id=p.category_id WHERE c.name=$1 LIMIT 1',[req.params.name]);if(used.rows[0])return res.status(400).json({message:'Нельзя удалить категорию, в которой есть услуги'});const result=await pool.query('DELETE FROM categories WHERE name=$1 RETURNING name',[req.params.name]);if(!result.rows[0])return res.status(404).json({message:'Категория не найдена'});res.json({message:'Категория удалена'});}catch(error){next(error);}});

app.get('/api/admin/orders',auth(),adminOnly,async(req,res,next)=>{try{const result=await pool.query(`SELECT 'ORD-'||LPAD(o.id::text,6,'0') AS order_number,u.email,u.full_name,o.total_amount,o.delivery_address,o.delivery_date,o.status,o.created_at FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC`);res.json({orders:result.rows});}catch(error){next(error);}});

app.patch('/api/admin/orders/:orderNumber/status',auth(),adminOnly,async(req,res,next)=>{try{const status=String(req.body.status||'').trim();const allowed=['created','confirmed','in_progress','completed','cancelled'];if(!allowed.includes(status))return res.status(400).json({message:'Некорректный статус'});const id=Number(String(req.params.orderNumber).replace('ORD-',''));if(!Number.isInteger(id))return res.status(400).json({message:'Некорректный номер заказа'});const result=await pool.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING status',[status,id]);if(!result.rows[0])return res.status(404).json({message:'Заказ не найден'});res.json({status:result.rows[0].status});}catch(error){next(error);}});

app.get('/api/admin/reviews',auth(),adminOnly,async(req,res,next)=>{try{const result=await pool.query(`SELECT r.review_code,r.rating,r.comment,r.created_at,u.email,p.service_code,p.name AS service_name FROM reviews r JOIN users u ON u.id=r.user_id JOIN products p ON p.id=r.product_id ORDER BY r.created_at DESC`);res.json({reviews:result.rows});}catch(error){next(error);}});

app.delete('/api/admin/reviews/:code',auth(),adminOnly,async(req,res,next)=>{try{const result=await pool.query('DELETE FROM reviews WHERE review_code=$1 RETURNING review_code',[req.params.code]);if(!result.rows[0])return res.status(404).json({message:'Отзыв не найден'});res.json({message:'Отзыв удалён'});}catch(error){next(error);}});

app.get('/api/admin/categories',auth(),adminOnly,async(req,res,next)=>{try{const result=await pool.query('SELECT c.name,COUNT(p.id)::int AS service_count FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id,c.name ORDER BY c.name');res.json({categories:result.rows});}catch(error){next(error);}});

app.get('/api/admin/users',auth(),adminOnly,async(req,res,next)=>{try{const result=await pool.query(`SELECT u.email,u.full_name,u.phone,u.default_address,u.personal_discount_percent,r.name AS role FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.email`);res.json({users:result.rows});}catch(error){next(error);}});

app.patch('/api/admin/users/:email/discount',auth(),adminOnly,async(req,res,next)=>{try{const value=Number(req.body.personal_discount_percent);if(!Number.isFinite(value)||value<0||value>100)return res.status(400).json({message:'Скидка должна быть от 0 до 100'});const result=await pool.query('UPDATE users SET personal_discount_percent=$1 WHERE email=$2 RETURNING email,personal_discount_percent',[value,req.params.email]);if(!result.rows[0])return res.status(404).json({message:'Пользователь не найден'});res.json({user:result.rows[0]});}catch(error){next(error);}});

app.use((err,req,res,next)=>{console.error(err);if(err.code==='23505')return res.status(409).json({message:'Такая запись уже существует'});res.status(500).json({message:'Внутренняя ошибка сервера'});});

const port=Number(process.env.PORT||3001);

app.listen(port,()=>console.log(`API started: http://localhost:${port}`));

