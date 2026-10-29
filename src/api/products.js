import { apiFetch } from './client';
export const getProducts = () => apiFetch('/products');
export const getCategories = () => apiFetch('/categories');
