import React from 'react';
import { Bell, AlertCircle, Clock } from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { useAuth } from '@/src/context/AuthContext';

export const StudentNotificationsPage: React.FC = () => {
  const { profile } = useAuth();
  const notifications = dataStore.getNotifications();

  // Filter notifications for student
  const filtered = notifications.filter((n) => {
    if (n.audience.type === 'all') return true;
    if (n.audience.type === 'class' && profile?.classIds) {
      return n.audience.ids.some((id) => profile.classIds.includes(id));
    }
    if (n.audience.type === 'user') {
      return n.audience.ids.includes(profile?.uid || '');
    }
    return false;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
          <Bell className="w-6 h-6 text-emerald-600" /> Notifications & Announcements
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Official institutional announcements, schedule changes, and homework alerts ({filtered.length} notices)
        </p>
      </div>

      <div className="space-y-4">
        {filtered.map((n) => {
          return (
            <div
              key={n.id}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    n.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {n.priority === 'high' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                  {n.priority.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h3 className="text-base font-bold text-[#0F2A4A] mt-2">{n.title}</h3>

              <div
                className="mt-2 text-xs text-slate-600 rich-text-content"
                dangerouslySetInnerHTML={{ __html: n.bodyHtml }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
