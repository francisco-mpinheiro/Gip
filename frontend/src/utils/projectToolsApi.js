import API from './api';

const projectPath = id => `/projects/${encodeURIComponent(id)}`;
const itemPath = (id, collection, itemId) => `${projectPath(id)}/${collection}/${encodeURIComponent(itemId)}`;

export const projectToolsAPI = {
  get: id => API.get(`${projectPath(id)}/tools`),
  createIssue: (id, data) => API.post(`${projectPath(id)}/issues`, data),
  resolveIssue: (id, itemId, data) => API.patch(itemPath(id, 'issues', itemId), data),
  createDependency: (id, data) => API.post(`${projectPath(id)}/dependencies`, data),
  deleteDependency: (id, itemId) => API.delete(itemPath(id, 'dependencies', itemId)),
  submitReview: (id, data) => API.post(`${projectPath(id)}/reviews`, data),
  decideReview: (id, itemId, data) => API.patch(itemPath(id, 'reviews', itemId), data),
  saveCheckIn: (id, data) => API.post(`${projectPath(id)}/check-ins`, data),
  createNote: (id, data) => API.post(`${projectPath(id)}/notes`, data),
  createDepartmentRequest: (id, data) => API.post(`${projectPath(id)}/department-requests`, data),
  resolveDepartmentRequest: (id, itemId, data) => API.patch(itemPath(id, 'department-requests', itemId), data),
  getDepartmentRequests: () => API.get('/department-requests'),
  simulate: (id, data) => API.post(`${projectPath(id)}/simulate`, data),
};
