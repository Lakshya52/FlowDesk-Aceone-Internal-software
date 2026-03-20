import { create } from 'zustand';

interface ThemeState {
    isDark: boolean;
    toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    isDark: localStorage.getItem('flowdesk_theme') === 'dark',
    toggle: () =>
        set((state) => {
            const isDark = !state.isDark;
            localStorage.setItem('flowdesk_theme', isDark ? 'dark' : 'light');
            document.documentElement.classList.toggle('dark', isDark);
            return { isDark };
        }),
}));

// Initialize theme on load
if (localStorage.getItem('flowdesk_theme') === 'dark') {
    document.documentElement.classList.add('dark');
}
