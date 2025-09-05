import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  logout: () => api.post('/auth/logout'),
  
  getProfile: () => api.get('/auth/profile'),
  
  updateProfile: (data: { username?: string; avatarUrl?: string }) =>
    api.patch('/auth/profile', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/auth/change-password', data),
};

// Groups API
export const groupsApi = {
  getGroups: (params?: { page?: number; limit?: number }) =>
    api.get('/groups', { params }),
  
  getGroup: (groupId: string) => api.get(`/groups/${groupId}`),
  
  createGroup: (data: {
    name: string;
    description?: string;
    isPublic: boolean;
    expiryDuration: number;
  }) => api.post('/groups', data),
  
  updateGroup: (groupId: string, data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
  }) => api.patch(`/groups/${groupId}`, data),
  
  deleteGroup: (groupId: string) => api.delete(`/groups/${groupId}`),
  
  joinGroup: (inviteCode: string) =>
    api.post('/groups/join', { inviteCode }),
  
  leaveGroup: (groupId: string) => api.delete(`/groups/${groupId}/leave`),
  
  getMembers: (groupId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/groups/${groupId}/members`, { params }),
  
  updateMemberRole: (groupId: string, userId: string, role: string) =>
    api.patch(`/groups/${groupId}/members/${userId}/role`, { role }),
  
  banMember: (groupId: string, userId: string, reason?: string) =>
    api.post(`/groups/${groupId}/members/${userId}/ban`, { reason }),
  
  generateNewInviteCode: (groupId: string) =>
    api.post(`/groups/${groupId}/invite-code/regenerate`),
};

// Messages API
export const messagesApi = {
  getMessages: (groupId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
    before?: string;
  }) => api.get(`/messages/${groupId}`, { params }),
  
  sendMessage: (groupId: string, data: {
    content?: string;
    type?: string;
    media?: any;
    replyTo?: string;
  }) => api.post(`/messages/${groupId}`, data),
  
  editMessage: (groupId: string, messageId: string, content: string) =>
    api.patch(`/messages/${groupId}/${messageId}`, { content }),
  
  deleteMessage: (groupId: string, messageId: string) =>
    api.delete(`/messages/${groupId}/${messageId}`),
  
  addReaction: (groupId: string, messageId: string, emoji: string) =>
    api.post(`/messages/${groupId}/${messageId}/reactions`, { emoji }),
  
  removeReaction: (groupId: string, messageId: string, emoji: string) =>
    api.delete(`/messages/${groupId}/${messageId}/reactions`, {
      params: { emoji },
    }),
  
  searchMessages: (groupId: string, query: string, params?: {
    page?: number;
    limit?: number;
  }) => api.get(`/messages/${groupId}/search`, { params: { q: query, ...params } }),
};

// Upload API
export const uploadApi = {
  getSignedUploadUrl: (data: { resourceType?: string; folder?: string }) =>
    api.post('/upload/signed-url', data),
  
  deleteMedia: (data: { publicId: string; resourceType?: string }) =>
    api.delete('/upload/media', { data }),
  
  getMediaInfo: (publicId: string, resourceType = 'image') =>
    api.get(`/upload/media/${resourceType}/${publicId}`),
};
