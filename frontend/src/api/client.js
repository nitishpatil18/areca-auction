import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// inject token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// surface api errors as plain Error with the server message
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'request failed';
    const wrapped = new Error(msg);
    wrapped.status = err.response?.status;
    wrapped.details = err.response?.data?.details;
    throw wrapped;
  }
);

export default api;