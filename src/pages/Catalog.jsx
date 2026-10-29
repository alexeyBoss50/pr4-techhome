import { useEffect, useState } from 'react';
import { getCategories, getServices } from '../api/services';
import CategorySidebar from '../components/CategorySidebar';
import ProductCard from '../components/ProductCard';

export default function Catalog() {
  const [services, setServices] = useState([]); const [categories, setCategories] = useState([]); const [selected, setSelected] = useState([]); const [maxPrice, setMaxPrice] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');

  async function load() { setLoading(true); setError(''); try { const data = await getServices({ category: selected[0], max_price: maxPrice }); setServices(data.services); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { getCategories().then(d => setCategories(d.categories)).catch(e => setError(e.message)); }, []);
  useEffect(() => { load(); }, [selected, maxPrice]);
  const toggle = name => setSelected(value => value.includes(name) ? value.filter(x => x !== name) : [name]);

  return <main className="page"><div className="page-head"><div><p className="eyebrow">ПРАКТИЧЕСКАЯ РАБОТА №4</p><h1>TechHome</h1><p className="subtitle">Заказ услуг по установке и настройке техники</p></div><button className="secondary-btn" onClick={load}>Обновить</button></div>
    <div className="catalog-layout"><CategorySidebar categories={categories} selected={selected} onToggle={toggle}/><section><div className="filter-bar"><label>Максимальная цена<input type="number" min="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Без ограничения"/></label>{selected.length > 0 && <button className="secondary-btn" onClick={() => setSelected([])}>Сбросить категорию</button>}</div>{loading && <div className="state">Загрузка услуг...</div>}{error && <div className="error-box">{error}</div>}{!loading && !error && <div className="products-grid">{services.length ? services.map(service => <ProductCard key={service.service_code} service={service}/>) : <div className="state">Услуг по выбранным условиям нет.</div>}</div>}</section></div>
  </main>;
}
