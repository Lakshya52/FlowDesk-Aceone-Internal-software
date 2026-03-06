import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    CalendarDays,
    BarChart3,
    FileText,
    Settings,
    Zap,
    Users,
} from 'lucide-react';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/assignments', icon: FolderKanban, label: 'Assignments' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/teams', icon: Users, label: 'Teams' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/files', icon: FileText, label: 'Files' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar: React.FC = () => {
    return (
        <aside
            style={{
                width: 'var(--sidebar-width)',
                background: 'var(--color-surface)',
                borderRight: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                flexShrink: 0,
            }}
        >
            {/* Logo */}
            <div
                style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderBottom: '1px solid var(--color-border)',
                }}
            >
                <div
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, var(--color-primary), #a78bfa)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Zap size={18} color="white" />
                </div>
                <span
                    style={{
                        fontSize: '1.125rem',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        color: 'var(--color-text)',
                    }}
                >
                    FlowDesk
                </span>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/dashboard'}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                background: isActive ? 'var(--color-primary-light)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.15s ease',
                            })}
                            onMouseEnter={(e) => {
                                const el = e.currentTarget;
                                if (!el.classList.contains('active')) {
                                    el.style.background = 'var(--color-surface-hover)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                const el = e.currentTarget;
                                if (!el.classList.contains('active')) {
                                    el.style.background = 'transparent';
                                }
                            }}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Footer */}
            <div
                style={{
                    padding: '16px',
                    borderTop: '1px solid var(--color-border)',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-tertiary)',
                    textAlign: 'center',
                }}
            >
                FlowDesk v1.0
            </div>
        </aside>
    );
};

export default Sidebar;
