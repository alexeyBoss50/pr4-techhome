import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../api/orders';
import { useCart } from '../context/CartContext';

export default function Checkout() {
  const { cart, total, refresh } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setDate(today);
  }, []);

  function validateAddress(value) {
    const text = value.trim();

    if (!text) {
      return 'Введите адрес доставки';
    }

    if (text.length < 10) {
      return 'Адрес должен содержать не менее 10 символов';
    }

    if (text.length > 255) {
      return 'Адрес не должен превышать 255 символов';
    }

    if (!/[А-Яа-яA-Za-z]/.test(text)) {
      return 'Введите корректный адрес';
    }

    if (!/\d/.test(text)) {
      return 'Укажите номер дома в адресе';
    }

    return '';
  }

  function validateDate(value) {
    if (!value) {
      return 'Выберите дату доставки';
    }

    if (value < today) {
      return 'Дата доставки не может быть раньше текущей даты';
    }

    return '';
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    const addressError = validateAddress(address);

    if (addressError) {
      setError(addressError);
      return;
    }

    const dateError = validateDate(date);

    if (dateError) {
      setError(dateError);
      return;
    }

    try {
      setLoading(true);

      await createOrder(address.trim(), date);
      await refresh();

      navigate('/dashboard');
    } catch (e) {
      setError(e.message || 'Не удалось оформить заказ');
    } finally {
      setLoading(false);
    }
  }

  if (!cart.length) {
    return (
      <main className="page narrow">
        <div className="empty">
          <h2>Корзина пуста</h2>
          <button
            className="primary-btn"
            onClick={() => navigate('/')}
          >
            К услугам
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page narrow">
      <div className="auth-card">
        <p className="eyebrow">ОФОРМЛЕНИЕ</p>

        <h1>Оформить заказ</h1>

        <div className="checkout-summary">
          Сумма заказа:{' '}
          <strong>
            {total.toLocaleString('ru-RU')} ₽
          </strong>
        </div>

        <form className="form" onSubmit={submit}>
          <label>
            Адрес доставки

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Москва, улица, дом, квартира"
              maxLength={255}
            />
          </label>

          <label>
            Дата доставки

            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button
            className="primary-btn"
            disabled={loading}
          >
            {loading ? 'Оформляем...' : 'Подтвердить заказ'}
          </button>
        </form>
      </div>
    </main>
  );
}