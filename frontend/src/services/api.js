/**
 * API service for communicating with the backend.
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ============================================================================
// Authentication API
// ============================================================================

export const authAPI = {
    register: async (email, password) => {
        const response = await apiClient.post('/auth/register', { email, password });
        return response.data;
    },

    login: async (email, password) => {
        const response = await apiClient.post('/auth/login', { email, password });
        if (response.data.access_token) {
            localStorage.setItem('access_token', response.data.access_token);
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('access_token');
    },

    getCurrentUser: async () => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },
};

// ============================================================================
// Chat API
// ============================================================================

export const chatAPI = {
    sendMessage: async (query, deviceType, brand, model, conversationId) => {
        const response = await apiClient.post('/chat', {
            query,
            device_type: deviceType,
            brand,
            model,
            conversation_id: conversationId,
        });
        return response.data;
    },

    getConversation: async (conversationId) => {
        const response = await apiClient.get(`/conversation/${conversationId}`);
        return response.data;
    },

    listConversations: async (limit = 20, skip = 0) => {
        const response = await apiClient.get('/conversations', {
            params: { limit, skip },
        });
        return response.data;
    },
};

// ============================================================================
// Documents API
// ============================================================================

export const documentsAPI = {
    uploadManual: async (file, deviceType, brand, model) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('device_type', deviceType);
        formData.append('brand', brand);
        if (model) {
            formData.append('model', model);
        }

        const response = await apiClient.post('/upload-manual', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    listDocuments: async (deviceType, brand, status, limit = 50, skip = 0) => {
        const response = await apiClient.get('/documents', {
            params: {
                device_type: deviceType,
                brand,
                status_filter: status,
                limit,
                skip,
            },
        });
        return response.data;
    },

    getDocument: async (documentId) => {
        const response = await apiClient.get(`/documents/${documentId}`);
        return response.data;
    },

    deleteDocument: async (documentId) => {
        const response = await apiClient.delete(`/documents/${documentId}`);
        return response.data;
    },
};

// ============================================================================
// Devices API
// ============================================================================

export const devicesAPI = {
    listDevices: async () => {
        const response = await apiClient.get('/devices');
        return response.data;
    },

    getDeviceInfo: async (deviceType) => {
        const response = await apiClient.get(`/devices/${deviceType}`);
        return response.data;
    },
};

// ============================================================================
// Feedback API
// ============================================================================

export const feedbackAPI = {
    submitFeedback: async (messageId, rating, comment) => {
        const response = await apiClient.post('/feedback', {
            message_id: messageId,
            rating,
            comment,
        });
        return response.data;
    },
};

// ============================================================================
// Health API
// ============================================================================

export const healthAPI = {
    checkHealth: async () => {
        const response = await apiClient.get('/health');
        return response.data;
    },
};

export default apiClient;
