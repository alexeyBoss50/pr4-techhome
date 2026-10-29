import { apiFetch } from './client';
export const loginRequest = (email, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const registerRequest = (payload) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
export const forgotPassword = (payload) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) });
export const getMe = () => apiFetch('/auth/me');
export const updateProfile = (payload) => apiFetch('/profile', { method: 'PUT', body: JSON.stringify(payload) });
export const changePassword = (payload) => apiFetch('/profile/password', { method: 'PUT', body: JSON.stringify(payload) });
