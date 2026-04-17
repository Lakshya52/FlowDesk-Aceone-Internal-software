import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Sidebar from './Sidebar';
import Header from './Header';

const AppLayout: React.FC = () => {
    const { user } = useAuthStore();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
    const [sidebarWidth, setSidebarWidth] = React.useState(() => {
        const saved = localStorage.getItem('sidebar-width');
        return saved ? parseInt(saved, 10) : 260;
    });
    const [isResizing, setIsResizing] = React.useState(false);

    React.useEffect(() => {
        if (!isResizing) {
            localStorage.setItem('sidebar-width', sidebarWidth.toString());
        }
    }, [sidebarWidth, isResizing]);

    const startResizing = React.useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                const newWidth = mouseMoveEvent.clientX;
                if (newWidth > 180 && newWidth < 600) {
                    setSidebarWidth(newWidth);
                }
            }
        },
        [isResizing]
    );

    React.useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return (
        <div style={{ 
            display: 'flex', 
            height: '100vh', 
            overflow: 'hidden',
            cursor: isResizing ? 'col-resize' : 'default',
            userSelect: isResizing ? 'none' : 'auto'
        }}>
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} width={sidebarWidth} />
            
            {/* Resizer Handle */}
            {isSidebarOpen && (
                <div
                    onMouseDown={startResizing}
                    style={{
                        width: '4px',
                        cursor: 'col-resize',
                        background: isResizing ? 'var(--color-primary)' : 'transparent',
                        zIndex: 50,
                        transition: 'background 0.2s ease',
                        marginLeft: '-2px', // overlapping the border
                        marginRight: '-2px',
                    }}
                    onMouseEnter={(e) => { if(!isResizing) e.currentTarget.style.background = 'var(--color-primary-light)'; }}
                    onMouseLeave={(e) => { if(!isResizing) e.currentTarget.style.background = 'transparent'; }}
                />
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Header />
                <main style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: location.pathname === '/canvas' ? '0' : '24px 32px',
                    background: 'var(--color-bg)',
                    position: 'relative'
                }}>
                    <div className="animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
