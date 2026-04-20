import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    // baseURL: 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('flowdesk_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('flowdesk_token');
            localStorage.removeItem('flowdesk_user');
            const currentPath = window.location.hash ? window.location.hash.replace('#', '') : window.location.pathname;
            if (!currentPath.includes('/login')) {
                if (window.location.hash) {
                    window.location.href = '/#/login';
                } else {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
