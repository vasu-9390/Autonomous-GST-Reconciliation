import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to inject JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('gst_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses for auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('gst_auth_token');
      localStorage.removeItem('gst_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Typed API modules
export const ApiService = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post('/auth/login', credentials),
    register: (data: any) => apiClient.post('/auth/register', data),
    getMe: () => apiClient.get('/auth/me'),
  },

  // Organizations
  organization: {
    get: () => apiClient.get('/organizations'),
    updateSettings: (settings: any) => apiClient.patch('/organizations/settings', settings),
    listMembers: () => apiClient.get('/organizations/members'),
    inviteMember: (data: any) => apiClient.post('/organizations/members', data),
  },

  // Imports
  imports: {
    preview: (formData: FormData) =>
      apiClient.post('/imports/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    execute: (formData: FormData) =>
      apiClient.post('/imports/execute', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    getJobs: () => apiClient.get('/imports/jobs'),
    getJobById: (id: string) => apiClient.get(`/imports/jobs/${id}`),
  },

  // Reconciliation
  reconciliation: {
    trigger: (options: any) => apiClient.post('/reconciliations/trigger', options),
    getRuns: () => apiClient.get('/reconciliations/runs'),
    getRunById: (runId: string) => apiClient.get(`/reconciliations/runs/${runId}`),
    getCases: (params?: any) => apiClient.get('/reconciliations/cases', { params }),
    getDashboardMetrics: () => apiClient.get('/reconciliations/dashboard-metrics'),
  },

  // Mismatches
  mismatches: {
    getById: (caseId: string) => apiClient.get(`/mismatches/${caseId}`),
    updateStatus: (caseId: string, data: { status: string; resolutionNotes?: string; actionTaken?: string }) =>
      apiClient.patch(`/mismatches/${caseId}/status`, data),
    assign: (caseId: string, assignedToUserId: string) =>
      apiClient.post(`/mismatches/${caseId}/assign`, { assignedToUserId }),
    addComment: (caseId: string, commentText: string) =>
      apiClient.post(`/mismatches/${caseId}/comments`, { commentText }),
  },

  // Copilot
  copilot: {
    explainMismatch: (caseId: string) =>
      apiClient.post('/copilot/explain-mismatch', { caseId }),
    summarizeRun: (runId: string) =>
      apiClient.post('/copilot/summarize-reconciliation', { runId }),
    ask: (question: string, context?: any) =>
      apiClient.post('/copilot/ask', { question, context }),
  },

  // Reports
  reports: {
    getSummary: () => apiClient.get('/reports/summary'),
    getSupplierVariance: () => apiClient.get('/reports/supplier-variance'),
    exportUrl: (format: 'xlsx' | 'csv', runId?: string, status?: string) => {
      const params = new URLSearchParams();
      params.append('format', format);
      if (runId) params.append('runId', runId);
      if (status) params.append('status', status);
      return `${API_BASE_URL}/reports/export?${params.toString()}`;
    },
  },

  // Notifications
  notifications: {
    list: () => apiClient.get('/notifications'),
    markAsRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    markAllAsRead: () => apiClient.patch('/notifications/mark-all-read'),
  },

  // Audit
  audit: {
    list: (params?: any) => apiClient.get('/audit', { params }),
  },
};
