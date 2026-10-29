import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { addCartItem, getCart, removeCartItem, updateCartItem } from '../api/cart';

const CartContext = createContext(null);

function effectiveDiscount(service, user) {
  return Math.max(Number(service.discount_percent || 0), Number(user?.personal_discount_percent || 0));
}

function normalize(item) {
  return { ...item, quantity: Number(item.quantity) || 1, price: Number(item.price) || 0, discount_percent: Number(item.discount_percent) || 0 };
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!user) { setCart([]); return; }
    setLoading(true);
    try { const data = await getCart(); setCart((data.items || []).map(normalize)); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh().catch(() => setCart([])); }, [user]);

  async function addToCart(service) {
    if (!user) throw new Error('Для добавления услуги в корзину войдите в аккаунт');
    await addCartItem(service.service_code, 1);
    await refresh();
  }

  async function decreaseQuantity(code) {
    const item = cart.find(x => x.service_code === code);
    if (!item) return;
    if (item.quantity <= 1) return removeFromCart(code);
    await updateCartItem(code, item.quantity - 1);
    setCart(items => items.map(x => x.service_code === code ? { ...x, quantity: x.quantity - 1 } : x));
  }

  async function increaseQuantity(code) {
    const item = cart.find(x => x.service_code === code);
    if (!item) return;
    await updateCartItem(code, item.quantity + 1);
    setCart(items => items.map(x => x.service_code === code ? { ...x, quantity: x.quantity + 1 } : x));
  }

  async function removeFromCart(code) {
    await removeCartItem(code);
    setCart(items => items.filter(x => x.service_code !== code));
  }

  const total = useMemo(() => cart.reduce((sum, item) => {
    const discount = effectiveDiscount(item, user);
    return sum + item.price * (1 - discount / 100) * item.quantity;
  }, 0), [cart, user]);

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return <CartContext.Provider value={{ cart, loading, addToCart, increaseQuantity, decreaseQuantity, removeFromCart, total, count, effectiveDiscount: item => effectiveDiscount(item, user), refresh }}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
