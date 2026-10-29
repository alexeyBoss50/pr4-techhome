import { apiFetch } from './client';

export const getServices = (params = {}) => {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.max_price) search.set('max_price', params.max_price);
  const suffix = search.toString() ? `?${search}` : '';
  return apiFetch(`/services${suffix}`);
};

export const getCategories = () => apiFetch('/categories');
export const getService = (code) => apiFetch(`/services/${encodeURIComponent(code)}`);
export const addReview = (code, rating, comment) => apiFetch(`/services/${encodeURIComponent(code)}/reviews`, { method: 'POST', body: JSON.stringify({ rating, comment }) });
