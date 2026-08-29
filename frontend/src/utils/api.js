import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

API.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  me: () => API.get('/auth/me'),
  forgotPassword: (data) => API.post('/auth/forgot-password', data),
  resetPassword: (data) => API.post('/auth/reset-password', data),
};

export const usersAPI = {
  getAll: (params) => API.get('/users', { params }),
  getById: (id) => API.get(`/users/${id}`),
  create: (data) => API.post('/users', data),
  update: (id, data) => API.put(`/users/${id}`, data),
  toggleActive: (id) => API.patch(`/users/${id}/toggle`),
  delete: (id) => API.delete(`/users/${id}`),
};

export const profileAPI = {
  get: () => API.get('/user/profile'),
  update: (data) => API.put('/user/profile', data),
  changePassword: (data) => API.post('/user/change-password', data),
};

export const educationAPI = {
  list: () => API.get('/user/education'),
  create: (formData) => API.post('/user/education', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => API.delete(`/user/education/${id}`),
};

export const projectsAPI = {
  getAll: () => API.get('/projects'),
  getById: (id) => API.get(`/projects/${id}`),
  create: (data) => API.post('/projects', data),
  update: (id, data) => API.put(`/projects/${id}`, data),
  delete: (id) => API.delete(`/projects/${id}`),
};

export const tasksAPI = {
  getAll: (params) => API.get('/tasks', { params }),
  getById: (id) => API.get(`/tasks/${id}`),
  create: (data) => API.post('/tasks', data),
  update: (id, data) => API.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => API.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => API.delete(`/tasks/${id}`),
  getComments: (id) => API.get(`/tasks/${id}/comments`),
  addComment: (id, content) => API.post(`/tasks/${id}/comments`, { content }),
  uploadAttachment: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post(`/tasks/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteAttachment: (id, attachmentId) => API.delete(`/tasks/${id}/attachments/${attachmentId}`),
};

export const dashboardAPI = {
  get: () => API.get('/dashboard'),
  performance: () => API.get('/performance'),
};

export const notificationsAPI = {
  getAll: () => API.get('/notifications'),
  markAsRead: (id) => API.patch(`/notifications/${id}/read`),
  markAllAsRead: () => API.patch('/notifications/read-all'),
};

export default API;
