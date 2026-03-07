import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Bell, Sun, Moon, LogOut, Search, ChevronDown } from 'lucide-react';
import api from '../../lib/api';

const Header: React.FC = () => {
    const { user, logout } = useAuthStore();
    const { isDark, toggle } = useThemeStore();
    const [showProfile, setShowProfile] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotif, setShowNotif] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await api.get('/notifications');
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            } catch { }
        };
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch { }
    };

    const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'manager' ? 'Manager' : 'Team Member';

    return (
        <header style={{
            height: 56,
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
        }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 400 }}>
                <Search size={16} color="var(--color-text-tertiary)" />
                <input
                    type="text"
                    placeholder="Search assignments, tasks..."
                    className="input"
                    style={{ border: 'none', boxShadow: 'none', padding: '6px 0', background: 'transparent' }}
                />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Theme toggle */}
                <button className="btn btn-ghost btn-sm" onClick={toggle} title="Toggle theme">
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                {/* Notifications */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowNotif(!showNotif)} style={{ position: 'relative' }}>
                        <Bell size={16} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: 'var(--color-danger)',
                                border: '2px solid var(--color-surface)',
                            }} />
                        )}
                    </button>

                    {showNotif && (
                        <div className="card animate-fade-in" style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: 8,
                            width: 360,
                            maxHeight: 420,
                            overflow: 'auto',
                            zIndex: 50,
                        }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifications</span>
                                {unreadCount > 0 && (
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={markAllRead}>Mark all read</button>
                                )}
                            </div>
                            {notifications.length === 0 ? (
                                <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.slice(0, 10).map((n) => (
                                    <div
                                        key={n._id}
                                        onClick={() => !n.isRead && markAsRead(n._id)}
                                        style={{
                                            padding: '12px 16px',
                                            borderBottom: '1px solid var(--color-border)',
                                            cursor: 'pointer',
                                            background: n.isRead ? 'transparent' : 'var(--color-primary-light)',
                                            transition: 'background 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = n.isRead ? 'transparent' : 'var(--color-primary-light)'; }}
                                    >
                                        <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{n.title}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{n.message}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div ref={profileRef} style={{ position: 'relative', marginLeft: 8 }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowProfile(!showProfile)}
                        style={{ gap: 8 }}
                    >
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: user?.avatar ? `url(${import.meta.env.VITE_SOCKET_URL}${user.avatar}) center/cover` : 'linear-gradient(135deg, var(--color-primary), #a78bfa)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            overflow: 'hidden'
                        }}>
                            {!user?.avatar && user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.2 }}>{user?.name}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', lineHeight: 1.2 }}>{roleLabel}</div>
                        </div>
                        <ChevronDown size={14} color="var(--color-text-tertiary)" />
                    </button>

                    {showProfile && (
                        <div className="card animate-fade-in" style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: 8,
                            width: 200,
                            padding: '4px',
                            zIndex: 50,
                        }}>
                            <button
                                className="btn btn-ghost"
                                style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 6, color: 'var(--color-danger)' }}
                                onClick={logout}
                            >
                                <LogOut size={16} />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
