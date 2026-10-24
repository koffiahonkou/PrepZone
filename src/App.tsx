import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { ColorModeProvider } from './context/ColorModeContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleRoute } from './components/auth/RoleRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardRouter } from './pages/dashboard/DashboardRouter';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminClassesPage } from './pages/admin/AdminClassesPage';
import { AdminSubjectsPage } from './pages/admin/AdminSubjectsPage';
import { AdminLessonsPage } from './pages/admin/AdminLessonsPage';
import { AdminQuizzesPage } from './pages/admin/AdminQuizzesPage';
import { AdminSubmissionsPage } from './pages/admin/AdminSubmissionsPage';
import { AdminGradebookPage } from './pages/admin/AdminGradebookPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { StudentLessonsPage } from './pages/student/StudentLessonsPage';
import { StudentQuizzesPage } from './pages/student/StudentQuizzesPage';
import { StudentResultsPage } from './pages/student/StudentResultsPage';
import { StudentNotificationsPage } from './pages/student/StudentNotificationsPage';
import { StagePlaceholderPage } from './pages/common/StagePlaceholderPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Application Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Common Authenticated Routes with Role-Aware Dashboards */}
              <Route path="/dashboard" element={<DashboardRouter />} />
              <Route path="/teacher" element={<DashboardRouter />} />
              <Route path="/lessons" element={<StudentLessonsPage />} />
              <Route path="/lessons/:id" element={<StudentLessonsPage />} />
              <Route path="/quizzes" element={<StudentQuizzesPage />} />
              <Route
                path="/quizzes/:id/take"
                element={
                  <StagePlaceholderPage
                    title="Interactive Quiz Taking Console"
                    stageName="Quiz Builder & Taking Experience"
                    stageNumber={3}
                    description="Full-screen test environment with countdown timer, localStorage draft autosave, and client-side Pass 1 instant auto-grading."
                    keyFeatures={[
                      'Fullscreen focused test mode with countdown timer',
                      'Option ID based scoring (never array index) preventing shuffle cheat',
                      'Automatic Pass 1 auto-grading upon submit (objective + short text)',
                      'Queues theory questions into status: pending_manual',
                    ]}
                  />
                }
              />
              <Route path="/results" element={<StudentResultsPage />} />
              <Route path="/results/:submissionId" element={<StudentResultsPage />} />
              <Route path="/notifications" element={<StudentNotificationsPage />} />

              {/* Academic Authoring & Grading Routes (Admin & Teacher) */}
              <Route
                element={
                  <RoleRoute allowedRoles={['admin', 'teacher']}>
                    <OutletWrapper />
                  </RoleRoute>
                }
              >
                <Route path="/admin/lessons" element={<AdminLessonsPage />} />
                <Route path="/admin/quizzes" element={<AdminQuizzesPage />} />
                <Route
                  path="/admin/quizzes/:id/edit"
                  element={
                    <StagePlaceholderPage
                      title="Interactive Quiz Builder"
                      stageName="Lessons, Quiz Builder, Quiz Taking"
                      stageNumber={3}
                      description="Drag-and-drop question authoring canvas with TipTap rich prompts and instant marks tally."
                      keyFeatures={[
                        'TipTap editor for prompts, explanations, and model answers',
                        'Question types: single choice, multiple select, true/false, short text, theory',
                        'Live marks tally and validation (>=1 correct answer for objective)',
                        'CSV questions import template',
                      ]}
                    />
                  }
                />
                <Route path="/admin/gradebook" element={<AdminGradebookPage />} />
                <Route path="/admin/submissions" element={<AdminSubmissionsPage />} />
                <Route path="/admin/submissions/:id" element={<AdminSubmissionsPage />} />
                <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
              </Route>

              {/* Administrative Control Routes (Admin-Only) */}
              <Route
                element={
                  <RoleRoute allowedRoles={['admin']}>
                    <OutletWrapper />
                  </RoleRoute>
                }
              >
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/classes" element={<AdminClassesPage />} />
                <Route path="/admin/subjects" element={<AdminSubjectsPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />
              </Route>
            </Route>

            {/* Root & Fallback */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </ColorModeProvider>
  </QueryClientProvider>
  );
}

function OutletWrapper() {
  return <Outlet />;
}
