import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme(); const { count } = useCart(); const { user, logout } = useAuth();
  return <header className="navbar"><div className="nav-inner">
    <NavLink className="brand" to="/">TechHome</NavLink>
    <nav><NavLink to="/" className="nav-link">Услуги</NavLink><NavLink to="/cart" className="nav-link">Корзина ({count})</NavLink>{user ? <NavLink to="/dashboard" className="nav-link">Личный кабинет</NavLink> : <NavLink to="/login" className="nav-link">Войти</NavLink>}</nav>
    <div className="nav-actions">{user && <span className="user-mini">{user.full_name || user.email}</span>}<button className="icon-btn" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>{user && <button className="secondary-btn" onClick={logout}>Выйти</button>}</div>
  </div></header>;
}
