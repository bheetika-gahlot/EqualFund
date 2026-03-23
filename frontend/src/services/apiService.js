import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach JWT token — admin token takes priority on admin pages
api.interceptors.request.use((config) => {
  const isAdminPage = window.location.pathname.startsWith('/admin');

  if (isAdminPage) {
    // Use admin token for admin pages
    const adminToken = localStorage.getItem('ef-admin-token');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      return config;
    }
  }

  // Use regular token for normal pages
  const token = localStorage.getItem('ef-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — only redirect regular users, not admin
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAdminPage = window.location.pathname.startsWith('/admin');
      if (isAdminPage) {
        // Admin session expired — go to admin login
        localStorage.removeItem('ef-admin-token');
        localStorage.removeItem('ef-admin-user');
        window.location.href = '/admin/login';
      } else {
        // Regular user session expired — go to login
        localStorage.removeItem('ef-token');
        localStorage.removeItem('ef-user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ─────────────────────────────────────────────────
export const authAPI = {
  register: async (name, email, password, role, walletAddress) => {
    const res = await api.post('/auth/register', { name, email, password, role, walletAddress });
    if (res.data.token) localStorage.setItem('ef-token', res.data.token);
    return res.data;
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.token) localStorage.setItem('ef-token', res.data.token);
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  updateProfile: async (data) => {
    const res = await api.put('/auth/profile', data);
    return res.data;
  },

  linkWallet: async (walletAddress) => {
    const res = await api.post('/auth/link-wallet', { walletAddress });
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('ef-token');
    localStorage.removeItem('ef-user');
    localStorage.removeItem('ef-wallet-connected');
    localStorage.removeItem('ef-admin-token');
    localStorage.removeItem('ef-admin-user');
  },
};

// ─── NOTIFICATIONS ────────────────────────────────────────
export const notificationsAPI = {
  getAll: async (page = 1) => {
    const res = await api.get(`/notifications?page=${page}`);
    return res.data;
  },

  getUnreadCount: async () => {
    const res = await api.get('/notifications/unread-count');
    return res.data.count;
  },

  markRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },

  markAllRead: async () => {
    const res = await api.put('/notifications/read-all');
    return res.data;
  },

  create: async (title, message, type, loanId, txHash, amount) => {
    const res = await api.post('/notifications', { title, message, type, loanId, txHash, amount });
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  },
};

// ─── ACTIVITY ─────────────────────────────────────────────
export const activityAPI = {
  getAll: async (page = 1, action = '') => {
    const res = await api.get(`/activity?page=${page}&action=${action}`);
    return res.data;
  },

  log: async (action, details = {}) => {
    try {
      const res = await api.post('/activity', { action, details });
      return res.data;
    } catch (e) {
      console.warn('Activity log failed:', e.message);
    }
  },

  getStats: async () => {
    const res = await api.get('/activity/stats');
    return res.data;
  },
};

// ─── USERS ────────────────────────────────────────────────
export const usersAPI = {
  getByWallet: async (walletAddress) => {
    const res = await api.get(`/users/wallet/${walletAddress}`);
    return res.data;
  },

  updateCreditScore: async (creditScore) => {
    const res = await api.put('/users/credit-score', { creditScore });
    return res.data;
  },

  updateKYC: async (kycStatus, kycIpfsHash) => {
    const res = await api.put('/users/kyc', { kycStatus, kycIpfsHash });
    return res.data;
  },

  getAllUsers: async (page = 1, role = '', kycStatus = '') => {
    const res = await api.get(`/users?page=${page}&role=${role}&kycStatus=${kycStatus}`);
    return res.data;
  },

  getStats: async () => {
    const res = await api.get('/admin/stats');  // use admin stats endpoint
    return res.data;
  },
};

export default api;
