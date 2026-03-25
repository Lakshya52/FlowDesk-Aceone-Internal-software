import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    CalendarDays,
    BarChart3,
    // FileText,
    Settings,
    Zap,
    Users,
    Menu,
    ChevronLeft,
    // ChevronRight
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
}

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/assignments', icon: FolderKanban, label: 'Projects' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/teams', icon: Users, label: 'Teams' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    { 
        to: '/reports', 
        icon: BarChart3, 
        label: 'Reports',
        subItems: [
            { to: '/reports/employee', label: 'Employee Tracking' },
            { to: '/reports/workload', label: 'Workload' },
            { to: '/reports/activity', label: 'User Activity' }
        ]
    },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
    return (
        <aside
            style={{
                width: isOpen ? 'var(--sidebar-width)' : '80px',
                transition: 'width 0.3s ease',
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
                    padding: isOpen ? '20px 24px' : '20px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isOpen ? 'flex-start' : 'center',
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
                        flexShrink: 0,
                    }}
                >
                    <Zap size={18} color="white" />
                </div>
                {isOpen && (
                    <span
                        style={{
                            fontSize: '1.125rem',
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            color: 'var(--color-text)',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        FlowDesk
                    </span>
                )}
            </div>

            {/* Toggle Button */}
            <div style={{ display: 'flex', justifyContent: isOpen ? 'flex-end' : 'center', padding: isOpen ? '12px 16px 0' : '12px 0 0' }}>
                <button
                    onClick={toggleSidebar}
                    style={{
                        background: 'var(--color-surface-hover)',
                        border: 'none',
                        borderRadius: '8px',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--color-text-secondary)'
                    }}
                >
                    {isOpen ? <ChevronLeft size={16} /> : <Menu size={16} />}
                </button>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: isOpen ? '12px' : '12px 8px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {navItems.map((item) => {
                        return (
                            <div key={item.to} style={{ display: 'flex', flexDirection: 'column' }}>
                                <NavLink
                                    to={item.to}
                                    end={item.to === '/dashboard'}
                                    style={({ isActive }) => ({
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: isOpen ? 'flex-start' : 'center',
                                        gap: '12px',
                                        padding: isOpen ? '10px 12px' : '12px',
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
                                    <item.icon size={20} style={{ flexShrink: 0 }} />
                                    {isOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                                </NavLink>
                                
                                {item.subItems && isOpen && (
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        marginLeft: '21px', // Aligns directly under the center of the 20px icon (12px padding + 10px half icon - 1px border)
                                        marginTop: '4px',
                                        marginBottom: '4px'
                                    }}>
                                        {item.subItems.map((sub, idx) => {
                                            const isLast = idx === item.subItems!.length - 1;
                                            return (
                                                <div key={sub.to} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                    {/* Vertical & Horizontal Branching Line */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: 0,
                                                        top: 0,
                                                        bottom: isLast ? '50%' : '-4px', // negative connects to next gap
                                                        borderLeft: '2px solid var(--color-border)',
                                                        borderBottom: isLast ? '2px solid var(--color-border)' : 'none',
                                                        borderBottomLeftRadius: isLast ? '8px' : '0',
                                                        width: isLast ? '20px' : '0'
                                                    }} />
                                                    {!isLast && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: 0,
                                                            top: '50%',
                                                            width: '20px',
                                                            borderTop: '2px solid var(--color-border)',
                                                        }} />
                                                    )}
                                                    
                                                    <NavLink
                                                        to={sub.to}
                                                        style={({ isActive }) => ({
                                                            marginLeft: '24px', // Push text past the horizontal line
                                                            padding: '8px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.8125rem',
                                                            fontWeight: isActive ? 600 : 400,
                                                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                                            textDecoration: 'none',
                                                            width: '100%',
                                                            transition: 'all 0.15s ease',
                                                        })}
                                                        onMouseEnter={(e) => {
                                                            const el = e.currentTarget;
                                                            if (!el.classList.contains('active')) {
                                                                el.style.color = 'var(--color-text)';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            const el = e.currentTarget;
                                                            if (!el.classList.contains('active')) {
                                                                el.style.color = 'var(--color-text-secondary)';
                                                            }
                                                        }}
                                                    >
                                                        {sub.label}
                                                    </NavLink>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </nav>

            {/* Footer */}
            {isOpen && (
                <div
                    style={{
                        padding: '16px',
                        borderTop: '1px solid var(--color-border)',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-tertiary)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                    }}
                >
                    FlowDesk v1.0
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
