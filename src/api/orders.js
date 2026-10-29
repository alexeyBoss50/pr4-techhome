import { apiFetch } from './client';
export const createOrder = (delivery_address, delivery_date) => apiFetch('/orders', { method: 'POST', body: JSON.stringify({ delivery_address, delivery_date }) });
export const getOrders = () => apiFetch('/orders');
