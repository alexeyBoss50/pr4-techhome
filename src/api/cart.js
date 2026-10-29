import { apiFetch } from './client';
export const getCart = () => apiFetch('/cart');
export const addCartItem = (service_code, quantity = 1) => apiFetch('/cart/items', { method: 'POST', body: JSON.stringify({ service_code, quantity }) });
export const updateCartItem = (code, quantity) => apiFetch(`/cart/items/${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
export const removeCartItem = (code) => apiFetch(`/cart/items/${encodeURIComponent(code)}`, { method: 'DELETE' });
export const clearCartApi = () => apiFetch('/cart', { method: 'DELETE' });
