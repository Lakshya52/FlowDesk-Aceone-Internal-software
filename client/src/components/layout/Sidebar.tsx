"use client"
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import packageJson from '../../../package.json';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import {
    LayoutDashboard,
    FolderKanban,
    // CheckSquare,
    CalendarDays,
    BarChart3,
    // FileText,
    Settings,
    // Zap,
    Users,
    // Menu,
    // ChevronLeft,
    ChevronDown,
    // ChevronRight
    Building2,
    Shapes,
    Mail,
    MessageSquare,
    PanelRightClose,
    PanelLeftClose,
    X,
    Headset,
    ScrollText,
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
    width?: number;
}

export const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    {   
        to: '/crm', 
        icon: Headset, 
        label: 'CRM', 
        subItems: [
            { to: '/crm/dashboard', label: 'Dashboard' },
            { to: '/crm/campaigns', label: 'Campaigns' },
            { to: '/crm/dial', label: 'Dial Queue' },
            { to: '/crm/schedule', label: 'Schedule' },
            { to: '/crm/plan', label: 'Plan' },
            { to: '/crm/logs', label: 'Logs' },
        ] 
    },
    { to: '/teams', icon: Users, label: 'Our Teams' },
    {
        to: '/assignments',
        icon: FolderKanban,
        label: 'Projects',
        subItems: [
            { to: '/assignments', label: 'Projects' },
            { to: '/tasks', label: 'Tasks' },
            // { to: '/reports/workload', label: 'Workload' },
            // { to: '/reports/activity', label: 'User Activity' }
        ]
    },
    { to: '/clients', icon: Building2, label: 'Companies & Clients', new: false },
    { to: '/bulk-email', icon: Mail, label: 'Bulk Messaging', new: false },
    { to: '/canvas', icon: Shapes, label: 'Canvas', new: false },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar', new: false },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    {
        to: '/reports',
        icon: BarChart3,
        label: 'Reports',
        subItems: [
            { to: '/reports/employee', label: 'Tracking' },
            { to: '/reports/workload', label: 'Workload' },
            { to: '/reports/activity', label: 'User Activity' }
        ]
    },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export const getFirstAllowedRoute = (user: any): string => {
    if (!user) return '/dashboard';
    if (user.role === 'admin') return '/dashboard';

    const allowed = user.permissions?.allowedTabs ?? navItems.map(n => n.to);

    // Check parent items first
    const firstParentMatch = navItems.find(item => allowed.includes(item.to));
    if (firstParentMatch) return firstParentMatch.to;

    // If no parent matches, check subItems (e.g. /tasks)
    for (const item of navItems) {
        if (item.subItems) {
            const firstSubMatch = item.subItems.find(sub => allowed.includes(sub.to));
            if (firstSubMatch) return firstSubMatch.to;
        }
    }

    return '/dashboard';
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, width = 260 }) => {
    const { totalUnreadCount } = useChatStore();
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const { user } = useAuthStore();
    const location = useLocation();

    const visibleNavItems = user?.role === 'admin'
        ? navItems
        : navItems.filter(item =>
            (user?.permissions?.allowedTabs ?? navItems.map(n => n.to)).includes(item.to)
        );

    const toggleExpand = (to: string) => {
        setExpandedItems(prev => ({
            ...prev,
            [to]: !prev[to]
        }));
    };

    return (
        <aside
            style={{
                width: isOpen ? `${width}px` : '80px',
                transition: 'width 0s linear', // Remove transition for smooth dragging
                background: 'var(--color-surface)',
                borderRight: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                flexShrink: 0,
                position: 'relative'
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
                        // background: 'linear-gradient(135deg, var(--color-primary), #a78bfa)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <img src="/icon.ico" alt="FlowDesk logo" className='rounded-lg' />
                    {/* <Zap size={18} color="white" /> */}
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

            {/* Toggle/Close Button */}
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
                    {window.innerWidth < 768 ? <X size={16} /> : (isOpen ? <PanelLeftClose size={16} /> : <PanelRightClose size={16} />)}
                </button>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: isOpen ? '12px' : '12px 8px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {visibleNavItems.map((item) => {
                        const hasSubItems = !!item.subItems && item.subItems.length > 0;
                        const isActiveParent = hasSubItems && item.subItems.some(sub =>
                            location.pathname === sub.to || location.pathname.startsWith(sub.to + '/')
                        );
                        const isExpanded = expandedItems[item.to] ?? isActiveParent;

                        return (
                            <div key={item.to} style={{ display: 'flex', flexDirection: 'column' }}>
                                {hasSubItems ? (
                                    // Parent with subItems - clickable to toggle
                                    <div
                                        onClick={() => toggleExpand(item.to)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: isOpen ? 'flex-start' : 'center',
                                            gap: '12px',
                                            padding: isOpen ? '10px 12px' : '12px',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontWeight: isActiveParent ? 600 : 400,
                                            color: isActiveParent ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                            background: isActiveParent ? 'var(--color-primary-light)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            textDecoration: 'none',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActiveParent) {
                                                e.currentTarget.style.background = 'var(--color-surface-hover)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActiveParent) {
                                                e.currentTarget.style.background = 'transparent';
                                            }
                                        }}
                                    >
                                        <item.icon size={20} style={{ flexShrink: 0 }} />
                                        {isOpen && (
                                            <>
                                                <span style={{ whiteSpace: 'nowrap', flex: 1 }}>{item.label}</span>
                                                <ChevronDown
                                                    size={16}
                                                    style={{
                                                        transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                        transition: 'transform 0.2s ease',
                                                        flexShrink: 0
                                                    }}
                                                />
                                            </>
                                        )}
                                    </div>
                                ) : (
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
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <item.icon size={20} style={{ flexShrink: 0 }} />
                                            {item.to === '/chat' && totalUnreadCount > 0 && !isOpen && (
                                                <span style={{
                                                    position: 'absolute',
                                                    top: '-4px',
                                                    right: '-4px',
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: 'var(--color-danger)',
                                                    boxShadow: '0 0 0 2px var(--color-surface)'
                                                }} />
                                            )}
                                        </div>
                                        {isOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                                        {item.to === '/chat' && totalUnreadCount > 0 && isOpen && (
                                            <span style={{
                                                marginLeft: 'auto',
                                                background: 'var(--color-danger)',
                                                color: 'white',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                minWidth: '18px',
                                                height: '18px',
                                                borderRadius: '9px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0 5px',
                                                lineHeight: 1
                                            }}>
                                                {totalUnreadCount}
                                            </span>
                                        )}
                                        {item.new && isOpen && (
                                            <span style={{
                                                fontSize: '0.6rem',
                                                background: '#22c55e',
                                                color: 'white',
                                                padding: '2px 6px',
                                                borderRadius: 10,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                lineHeight: 1
                                            }}>New&nbsp;Features</span>
                                        )}
                                    </NavLink>
                                )}


                                {item.subItems && isOpen && isExpanded && (
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
                    FlowDesk v{packageJson.version}
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
