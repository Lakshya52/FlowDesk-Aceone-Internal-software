import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import api from '../lib/api';
import { Sun, Moon, Shield, Users, UserPlus, Trash2 } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', manager: 'Manager', member: 'Team Member' };

const SettingsPage: React.FC = () => {
    const { user } = useAuthStore();
    const { isDark, toggle } = useThemeStore();
    const [users, setUsers] = useState<any[]>([]);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'member' });
    const [saving, setSaving] = useState(false);

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (isAdmin) {
            api.get('/auth/users').then(({ data }) => setUsers(data.users || []));
        }
    }, [isAdmin]);

    const createUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/auth/register', newUser);
            const { data } = await api.get('/auth/users');
            setUsers(data.users || []);
            setShowCreateUser(false);
            setNewUser({ name: '', email: '', password: '', role: 'member' });
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to create user');
        } finally {
            setSaving(false);
        }
    };

    const deactivateUser = async (id: string) => {
        if (!confirm('Deactivate this user?')) return;
        try {
            await api.delete(`/auth/users/${id}`);
            setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: false } : u));
        } catch { }
    };

    const permanentDeleteUser = async (id: string) => {
        if (!isAdmin) return;
        if (!confirm('WARNING: This will PERMANENTLY delete the user and all their personal data. This cannot be undone. Are you sure?')) return;
        if (!confirm('Are you REALLY sure?')) return;

        try {
            await api.delete(`/auth/users/${id}/permanent`);
            setUsers(prev => prev.filter(u => u._id !== id));
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to delete user');
        }
    };

    return (
        <div style={{ maxWidth: 800 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 24 }}>Settings</h1>

            {/* Appearance */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>Appearance</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isDark ? <Moon size={18} /> : <Sun size={18} />}
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{isDark ? 'Dark' : 'Light'} Theme</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Toggle between light and dark mode</div>
                        </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={toggle}>
                        Switch to {isDark ? 'Light' : 'Dark'}
                    </button>
                </div>
            </div>

            {/* Profile */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>Profile</h3>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), #a78bfa)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '1.25rem', fontWeight: 600,
                    }}>
                        {user?.name?.charAt(0)}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{user?.name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{user?.email}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Shield size={14} color="var(--color-primary)" />
                            <span style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 500 }}>{ROLE_LABELS[user?.role || '']}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Management (Admin only) */}
            {isAdmin && (
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            <Users size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                            User Management
                        </h3>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateUser(!showCreateUser)}>
                            <UserPlus size={14} /> Add User
                        </button>
                    </div>

                    {showCreateUser && (
                        <form onSubmit={createUser} className="card" style={{ padding: 16, marginBottom: 16, border: '1px solid var(--color-primary)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <input className="input" required placeholder="Full name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                                <input className="input" type="email" required placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <input className="input" type="password" required placeholder="Password" minLength={6} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                                <select className="select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreateUser(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Creating...' : 'Create User'}</button>
                            </div>
                        </form>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {users.map(u => (
                            <div key={u._id} style={{
                                padding: '10px 14px', borderRadius: 8,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: u.isActive ? 'transparent' : 'var(--color-surface-hover)',
                                opacity: u.isActive ? 1 : 0.5,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 600,
                                    }}>
                                        {u.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{u.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{u.email}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="badge" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' }}>
                                        {ROLE_LABELS[u.role]}
                                    </span>
                                    {u.isActive && u._id !== user?._id && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => deactivateUser(u._id)} style={{ color: 'var(--color-warning)' }} title="Deactivate">
                                            <Shield size={14} />
                                        </button>
                                    )}
                                    {u._id !== user?._id && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => permanentDeleteUser(u._id)} style={{ color: 'var(--color-error)' }} title="Delete Permanently">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
