import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';

export default function ForgotPassword() {
  const [email,setEmail]=useState(''); const [phone,setPhone]=useState(''); const [password,setPassword]=useState(''); const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function submit(e){e.preventDefault();setError('');setMessage('');if(!email||!phone||!password)return setError('Заполните все поля');try{setLoading(true);const data=await forgotPassword({email,phone,new_password:password});setMessage(data.message);}catch(e){setError(e.message);}finally{setLoading(false);}}
  return <main className="page narrow"><div className="auth-card"><p className="eyebrow">ВОССТАНОВЛЕНИЕ</p><h1>Забыли пароль?</h1><p className="subtitle">Подтвердите email и телефон, после чего задайте новый пароль.</p><form className="form" onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Телефон<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Новый пароль<input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="error-box">{error}</div>}{message&&<div className="success-box">{message}</div>}<button className="primary-btn" disabled={loading}>{loading?'Сохраняем...':'Изменить пароль'}</button></form><p><Link to="/login">Вернуться ко входу</Link></p></div></main>;
}
