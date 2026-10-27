import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jj_token');
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
      if (!error.config.url.includes('/auth/login')) {
        localStorage.removeItem('jj_token');
        localStorage.removeItem('jj_user');
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.data?.token) {
      localStorage.setItem('jj_token', res.data.data.token);
      localStorage.setItem('jj_user', JSON.stringify(res.data.data.user));
    }
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('jj_token');
    localStorage.removeItem('jj_user');
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
  getCategories: async () => {
    const res = await api.get('/products/categories');
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
  getUsers: async () => {
    const res = await api.get('/users');
    return res.data;
  },
  createUser: async (userData) => {
    const res = await api.post('/users', userData);
    return res.data;
  },
};

export default api;
