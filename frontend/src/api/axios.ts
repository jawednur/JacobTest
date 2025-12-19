import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: BASE_URL, // Adjust if backend port differs
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                try {
                    const response = await axios.post(`${BASE_URL}/users/token/refresh/`, {
                        refresh: refreshToken,
                    });
                    localStorage.setItem('accessToken', response.data.access);
                    // Update header for this instance
                    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
                    // Update header for original request
                    originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // Refresh token invalid/expired
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            } else {
                 // No refresh token available
                 localStorage.removeItem('accessToken');
                 localStorage.removeItem('refreshToken');
                 window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
