import axios from 'axios';

// Cookie helper utilities for browser environment
export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
};

export const setCookie = (name, value, days = 7) => {
  if (typeof document === 'undefined') return;
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = `${name}=${encodeURIComponent(value || '')}${expires}; path=/; SameSite=Lax`;
};

export const removeCookie = (name) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
};

// Resolve API Base URL from .env (VITE_API_BASE_URL) or default to /api/v1
const resolveBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl) {
    return '/api/v1';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }
  return `${cleanUrl}/api/v1`;
};

export const API_BASE_URL = resolveBaseUrl();

// Helper to construct absolute PDF invoice URL for browser downloads and WhatsApp sharing
export const getInvoicePdfUrl = (invoiceId) => {
  if (!invoiceId) return '';
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    return `${API_BASE_URL}/billing/${invoiceId}/pdf`;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${API_BASE_URL}/billing/${invoiceId}/pdf`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Automatically sends cookies with cross-origin or same-site requests
});

// Request interceptor: read token from cookies and attach Authorization header as extra assurance
api.interceptors.request.use((config) => {
  config.withCredentials = true;
  const token = getCookie('jj_token') || getCookie('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle unauthenticated 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        removeCookie('token');
        removeCookie('jj_token');
        localStorage.removeItem('jj_user');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.data?.token) {
      setCookie('jj_token', res.data.data.token, 7);
      setCookie('token', res.data.data.token, 7);
      localStorage.setItem('jj_user', JSON.stringify(res.data.data.user));
    }
    return res.data;
  },
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API error:', err);
    }
    removeCookie('token');
    removeCookie('jj_token');
    localStorage.removeItem('jj_user');
  },
  changePassword: async ({ currentPassword, newPassword }) => {
    const res = await api.put('/auth/change-password', { currentPassword, newPassword });
    if (res.data?.data?.token) {
      setCookie('jj_token', res.data.data.token, 7);
      setCookie('token', res.data.data.token, 7);
      if (res.data.data.user) {
        localStorage.setItem('jj_user', JSON.stringify(res.data.data.user));
      }
    }
    return res.data;
  },
};

export const storeService = {
  getStores: async () => {
    const res = await api.get('/stores');
    return res.data;
  },
  getCities: async () => {
    const res = await api.get('/stores/cities');
    return res.data;
  },
  getStoreDetails: async (id) => {
    const res = await api.get(`/stores/${id}`);
    return res.data;
  },
  createCity: async (cityData) => {
    const res = await api.post('/stores/cities', cityData);
    return res.data;
  },
  createStore: async (storeData) => {
    const res = await api.post('/stores', storeData);
    return res.data;
  },
};

export const categoryService = {
  getCategories: async (params) => {
    const res = await api.get('/products/categories', { params });
    return res.data;
  },
  createCategory: async (categoryData) => {
    const res = await api.post('/products/categories', categoryData);
    return res.data;
  },
  updateCategory: async (id, categoryData) => {
    const res = await api.put(`/products/categories/${id}`, categoryData);
    return res.data;
  },
  deleteCategory: async (id) => {
    const res = await api.delete(`/products/categories/${id}`);
    return res.data;
  },
};

export const productService = {
  getProducts: async (params) => {
    const res = await api.get('/products', { params });
    return res.data;
  },
  lookupByCode: async (code, storeId) => {
    const res = await api.get(`/products/lookup/${encodeURIComponent(code)}`, {
      params: storeId ? { storeId } : {},
    });
    return res.data;
  },
  getCategories: async (params) => {
    const res = await api.get('/products/categories', { params });
    return res.data;
  },
  createCategory: async (categoryData) => {
    const res = await api.post('/products/categories', categoryData);
    return res.data;
  },
  updateCategory: async (id, categoryData) => {
    const res = await api.put(`/products/categories/${id}`, categoryData);
    return res.data;
  },
  deleteCategory: async (id) => {
    const res = await api.delete(`/products/categories/${id}`);
    return res.data;
  },
  createProduct: async (productData) => {
    const res = await api.post('/products', productData);
    return res.data;
  },
  updateProduct: async (id, productData) => {
    const res = await api.put(`/products/${id}`, productData);
    return res.data;
  },
  adjustStock: async (id, payload) => {
    const res = await api.post(`/products/${id}/adjust-stock`, payload);
    return res.data;
  },
};

export const billingService = {
  createInvoice: async (invoicePayload) => {
    const res = await api.post('/billing', invoicePayload);
    return res.data;
  },
  getInvoices: async (params) => {
    const res = await api.get('/billing', { params });
    return res.data;
  },
  getInvoiceById: async (id) => {
    const res = await api.get(`/billing/${id}`);
    return res.data;
  },
  cancelInvoice: async (id, reason) => {
    const res = await api.post(`/billing/${id}/cancel`, { reason });
    return res.data;
  },
  collectDue: async (id, payload) => {
    const res = await api.post(`/billing/${id}/collect-due`, payload);
    return res.data;
  },
  sendWhatsApp: async (id) => {
    const res = await api.post(`/billing/${id}/send-whatsapp`);
    return res.data;
  },
};

export const paymentService = {
  getInvoiceQr: async (invoiceId) => {
    const res = await api.get(`/payments/${invoiceId}/qr`);
    return res.data;
  },
  confirmPayment: async (invoiceId, payload) => {
    const res = await api.post(`/payments/${invoiceId}/confirm`, payload);
    return res.data;
  },
};

export const userService = {
  getUsers: async (params) => {
    const res = await api.get('/users', { params });
    return res.data;
  },
  createUser: async (userData) => {
    const res = await api.post('/users', userData);
    return res.data;
  },
  updateUser: async (id, userData) => {
    const res = await api.put(`/users/${id}`, userData);
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
};

export default api;
