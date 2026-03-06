import { create } from 'zustand';
import api from '../lib/api';

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    isActive: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: JSON.parse(localStorage.getItem('flowdesk_user') || 'null'),
    token: localStorage.getItem('flowdesk_token'),
    isLoading: false,

    login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('flowdesk_token', data.token);
            localStorage.setItem('flowdesk_user', JSON.stringify(data.user));
            set({ user: data.user, token: data.token, isLoading: false });
        } catch (error: any) {
            set({ isLoading: false });
            throw new Error(error.response?.data?.message || 'Login failed');
        }
    },

    register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
            const { data } = await api.post('/auth/register', { name, email, password });
            localStorage.setItem('flowdesk_token', data.token);
            localStorage.setItem('flowdesk_user', JSON.stringify(data.user));
            set({ user: data.user, token: data.token, isLoading: false });
        } catch (error: any) {
            set({ isLoading: false });
            throw new Error(error.response?.data?.message || 'Registration failed');
        }
    },

    logout: () => {
        localStorage.removeItem('flowdesk_token');
        localStorage.removeItem('flowdesk_user');
        set({ user: null, token: null });
    },

    loadUser: async () => {
        try {
            const { data } = await api.get('/auth/me');
            localStorage.setItem('flowdesk_user', JSON.stringify(data.user));
            set({ user: data.user });
        } catch {
            localStorage.removeItem('flowdesk_token');
            localStorage.removeItem('flowdesk_user');
            set({ user: null, token: null });
        }
    },
}));
