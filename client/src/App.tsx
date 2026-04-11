import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import Buddy from './components/common/Buddy';

const App: React.FC = () => {

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Buddy />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/assignments/:id" element={<AssignmentDetailPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/reports" element={<Navigate to="/reports/employee" replace />} />
            <Route path="/reports/:reportType" element={<ReportsPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<ProtectedNotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Simple helper to decide if we show 404 inside layout or full screen
const ProtectedNotFound: React.FC = () => {
  return <NotFoundPage />;
};

export default App;
