import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addReview, getService } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function ServiceDetails() {
  const { code } = useParams(); const { user } = useAuth(); const { addToCart } = useCart();
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [rating, setRating] = useState(5); const [comment, setComment] = useState(''); const [message, setMessage] = useState('');
  async function load() { setLoading(true); try { setData(await getService(code)); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, [code]);
  async function review(e) { e.preventDefault(); setMessage(''); try { await addReview(code, rating, comment); setComment(''); setMessage('Отзыв добавлен.'); await load(); } catch (e) { setMessage(e.message); } }
  if (loading) return <main className="page"><div className="state">Загрузка услуги...</div></main>;
  if (error) return <main className="page"><div className="error-box">{error}</div></main>;
  const { service, reviews } = data;
  return <main className="page narrow"><Link className="nav-link" to="/">← К услугам</Link><div className="detail-card"><p className="eyebrow">{service.category_name}</p><h1>{service.name}</h1><p>{service.description}</p><div className="detail-grid"><span>Длительность: {service.duration_minutes} мин.</span><span>Рейтинг: ★ {service.rating || 0}</span><strong>{Number(service.price).toLocaleString('ru-RU')} ₽</strong></div><button className="primary-btn" onClick={() => addToCart(service)} disabled={!user}>{user ? 'Добавить в корзину' : 'Войдите для заказа'}</button></div>
    <section className="reviews"><h2>Отзывы</h2>{reviews.length ? reviews.map(review => <article className="review" key={review.review_code}><div><strong>{review.full_name}</strong><span> · {'★'.repeat(review.rating)}</span></div><p>{review.comment}</p><small>{new Date(review.created_at).toLocaleDateString('ru-RU')}</small></article>) : <p className="subtitle">Пока нет отзывов.</p>}
    {user ? <form className="auth-card" onSubmit={review}><h3>Оставить отзыв</h3><label>Оценка<select value={rating} onChange={e => setRating(Number(e.target.value))}>{[5,4,3,2,1].map(x => <option key={x} value={x}>{x}</option>)}</select></label><label>Комментарий<textarea value={comment} onChange={e => setComment(e.target.value)} minLength={3} maxLength={1000} required placeholder="Расскажите о качестве услуги"/></label>{message && <div className={message.includes('добавлен') ? 'success-box' : 'error-box'}>{message}</div>}<button className="primary-btn">Отправить отзыв</button></form> : <div className="hint">Чтобы оставить отзыв, войдите в аккаунт.</div>}</section>
  </main>;
}
