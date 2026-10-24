import React, { useState, useMemo } from 'react';
import { Bell, AlertCircle, Clock, CheckCircle2, Check, Calendar } from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { useAuth } from '@/src/context/AuthContext';
import {
  isAnnouncementVisibleForStudent,
  getAnnouncementAvailability,
  formatAnnouncementDateTime,
} from '@/src/utils/announcementAvailability';
import { toast } from 'sonner';

export const StudentNotificationsPage: React.FC = () => {
  const { profile } = useAuth();
  const [ticker, setTicker] = useState(0);

  const notifications = useMemo(() => dataStore.getNotifications(), [ticker]);

  // Filter notifications for student using automated time scheduling and class streams
  const filtered = useMemo(() => {
    return notifications.filter((n) => isAnnouncementVisibleForStudent(n, profile));
  }, [notifications, profile, ticker]);

  const readIds = useMemo(() => {
    return dataStore.getNotificationReads(profile?.uid);
  }, [profile?.uid, ticker]);

  const unreadCount = filtered.filter((n) => !readIds.includes(n.id)).length;

  const handleMarkAllRead = () => {
    if (!profile?.uid || !filtered.length) return;
    const ids = filtered.map((n) => n.id);
    dataStore.markAllNotificationsAsRead(ids, profile.uid);
    setTicker((t) => t + 1);
    toast.success('All announcements marked as read.');
  };

  const handleMarkSingleRead = (notifId: string) => {
    if (!profile?.uid) return;
    dataStore.markNotificationAsRead(notifId, profile.uid);
    setTicker((t) => t + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" /> Notifications & Announcements
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official institutional notices, exam timetables, and homework broadcasts ({filtered.length} active notices)
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
          >
            <Check className="w-4 h-4 text-emerald-600" /> Mark All Read ({unreadCount})
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
            <Bell className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-slate-700">No Active Announcements</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Any institutional broadcasts or alerts scheduled for your class stream will appear here when active.
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const avail = getAnnouncementAvailability(n);
            const isRead = readIds.includes(n.id);

            return (
              <div
                key={n.id}
                onClick={() => !isRead && handleMarkSingleRead(n.id)}
                className={`bg-white p-6 rounded-xl border shadow-2xs hover:shadow-xs transition-shadow relative ${
                  !isRead ? 'border-emerald-300 ring-1 ring-emerald-500/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        n.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {n.priority === 'high' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                      {n.priority.toUpperCase()} PRIORITY
                    </span>

                    {avail.timeRemainingFormatted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        Closes in {avail.timeRemainingFormatted}
                      </span>
                    )}

                    <span className="text-xs text-slate-400">
                      {formatAnnouncementDateTime(n.startDate || n.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isRead ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                        NEW UNREAD
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200">
                        <CheckCircle2 className="w-3 h-3 text-slate-400" /> Read
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#0F2A4A] mt-2.5">{n.title}</h3>

                <div
                  className="mt-2.5 text-xs text-slate-600 rich-text-content leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: n.bodyHtml }}
                />

                {avail.endDate && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Notice scheduled to automatically expire on{' '}
                      <strong className="text-slate-600">{formatAnnouncementDateTime(avail.endDate)}</strong>
                    </span>

                    {!isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkSingleRead(n.id);
                        }}
                        className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
