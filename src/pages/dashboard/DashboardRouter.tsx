import React from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { AdminDashboard } from '@/src/pages/admin/AdminDashboard';
import { TeacherDashboard } from '@/src/pages/dashboard/TeacherDashboard';
import { StudentDashboard } from '@/src/pages/dashboard/StudentDashboard';

/**
 * Universal Dashboard Router
 * Seamlessly delivers the dedicated dashboard view for each account type:
 * - Administrator: Institutional oversight, user directory, system configuration, academic stream setup
 * - Teacher: Assessment authoring, theory grading queue, quiz/announcement reactivation hub
 * - Student: Enrolled class, pending/completed tests, video lecture notes, progress results
 */
export const DashboardRouter: React.FC = () => {
  const { profile } = useAuth();

  if (profile?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (profile?.role === 'teacher') {
    return <TeacherDashboard />;
  }

  return <StudentDashboard />;
};
