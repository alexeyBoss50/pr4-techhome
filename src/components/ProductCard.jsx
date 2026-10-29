import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function ProductCard({ service }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const hasDiscount = Number(service.discount_percent) > 0;
  const price = Number(service.price) * (1 - Number(service.discount_percent || 0) / 100);

  async function add() {
    try { setMessage(''); await addToCart(service); setMessage('Услуга добавлена в корзину.'); }
    catch (e) { setMessage(e.message); }
  }

  return <article className="product-card">
    <div className="product-top"><span className="product-category">{service.category_name}</span>{hasDiscount && <span className="discount-badge">-{service.discount_percent}%</span>}</div>
    <h3>{service.name}</h3>
    <p>{service.description}</p>
    <div className="service-details"><span>Длительность: {service.duration_minutes} мин.</span><span>★ {service.rating || 0}</span></div>
    <div className="product-meta">{hasDiscount && <s>{Number(service.price).toLocaleString('ru-RU')} ₽</s>}<strong>{price.toLocaleString('ru-RU')} ₽</strong></div>
    {message && <div className={message.includes('добавлена') ? 'success-box' : 'error-box'}>{message}</div>}
    <div className="card-actions"><Link className="secondary-btn" to={`/services/${service.service_code}`}>Подробнее</Link><button className="primary-btn" onClick={add}>{user ? 'В корзину' : 'Войти для заказа'}</button></div>
  </article>;
}
