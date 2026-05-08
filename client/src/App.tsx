import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import axios from 'axios';
import api from './lib/api';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AssignmentsPage from './pages/AssignmentsPage';
import AssignmentDetailPage from './pages/AssignmentDetailPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import ReportsPage from './pages/ReportsPage';
import FilesPage from './pages/FilesPage';
import SettingsPage from './pages/SettingsPage';
import TeamsPage from './pages/TeamsPage';
import ClientsPage from './pages/ClientsPage';
import CanvasPage from './pages/CanvasPage';
import BulkEmailPage from './pages/BulkEmailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import Buddy from './components/common/Buddy';

const App: React.FC = () => {
  const [isBackendReady, setIsBackendReady] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await api.get('/health');
        setIsBackendReady(true);
      } catch (error) {
        console.error('Backend health check failed:', error);
        setIsBackendReady(false);
      }
    };

    checkBackend();
  }, []);

  if (isBackendReady === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-outfit">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#3b82f6]/20 border-t-[#3b82f6] rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-[#8b5cf6]/40 rounded-full animate-pulse"></div>
        </div>
        <br />
        <p className="mt-6 text-slate-500 font-medium animate-pulse tracking-wide uppercase text-sm">
          Establishing Server Connection
        </p>
      </div>
    );
  }

  if (isBackendReady === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-outfit " style={{ padding: "20px" }}>
        <div className="p-8 flex flex-col items-center justify-center gap-5  rounded-3xl bg-white border border-slate-200 shadow-xl max-w-md w-full relative overflow-hidden" style={{ padding: "30px" }}>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#ef4444]/5 rounded-full blur-3xl"></div>

          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Server Connection Failed</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            We couldn't connect to FlowDesk services. This might be due to a temporary outage or network issues.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 cursor-pointer bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white font-semibold rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.98]"
            style={{ width: "100%", height: "50px" }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Buddy />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/assignments/:id" element={<AssignmentDetailPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/reports" element={<Navigate to="/reports/employee" replace />} />
            <Route path="/reports/:reportType" element={<ReportsPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/canvas" element={<CanvasPage />} />
            <Route path="/bulk-email" element={<BulkEmailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<ProtectedNotFound />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
};

// Simple helper to decide if we show 404 inside layout or full screen
const ProtectedNotFound: React.FC = () => {
  return <NotFoundPage />;
};

export default App;
