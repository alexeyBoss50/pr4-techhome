import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Checkout from './pages/Checkout';
import ServiceDetails from './pages/ServiceDetails';
import Dashboard from './pages/Dashboard';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';

function Protected({ children }) { const { user, loading }=useAuth(); if(loading)return <div className="state">Проверяем авторизацию...</div>; return user?children:<Navigate to="/login" replace/>; }
export default function App(){const {theme}=useTheme();return <div className={`app ${theme}`}><Navbar/><Routes><Route path="/" element={<Catalog/>}/><Route path="/services/:code" element={<ServiceDetails/>}/><Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Protected><Checkout/></Protected>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/><Route path="/forgot-password" element={<ForgotPassword/>}/><Route path="/dashboard" element={<Protected><Dashboard/></Protected>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></div>}
