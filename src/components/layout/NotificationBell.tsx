import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Bell, Check, ExternalLink, AlertCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { dataStore } from '@/src/services/dataStore';
import { AppNotification } from '@/src/types';
import {
  isAnnouncementVisibleForStudent,
  formatAnnouncementDateTime,
} from '@/src/utils/announcementAvailability';

export const NotificationBell: React.FC = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() =>
    dataStore.getNotificationReads(profile?.uid)
  );
  const [allNotifs, setAllNotifs] = useState<AppNotification[]>(() =>
    dataStore.getNotifications()
  );

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync read state from dataStore
  const refreshReadState = useCallback(() => {
    if (profile?.uid) {
      setReadIds(dataStore.getNotificationReads(profile.uid));
    }
    setAllNotifs(dataStore.getNotifications());
  }, [profile?.uid]);

  useEffect(() => {
    refreshReadState();
  }, [profile?.uid, refreshReadState]);

  // Listen to read events across tabs or components
  useEffect(() => {
    const handleReadEvent = (e: Event) => {
      const custom = e as CustomEvent<{ userId?: string }>;
      if (!custom.detail?.userId || custom.detail.userId === profile?.uid) {
        refreshReadState();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'eduform_store_notification_reads' ||
        e.key === 'eduform_store_notifications'
      ) {
        refreshReadState();
      }
    };

    window.addEventListener('prepzone_notifications_read', handleReadEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('prepzone_notifications_read', handleReadEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [profile?.uid, refreshReadState]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter notifications eligible for current user
  const userNotifications = useMemo(() => {
    if (!profile) return [];

    if (profile.role === 'admin' || profile.role === 'teacher') {
      return allNotifs;
    }

    // Student: filter by class, user, and automated time-based schedule
    return allNotifs.filter((n) => isAnnouncementVisibleForStudent(n, profile));
  }, [allNotifs, profile]);

  // Compute unread count based on persistent read storage
  const unreadCount = useMemo(() => {
    if (!profile?.uid) return 0;
    return userNotifications.filter((n) => !readIds.includes(n.id)).length;
  }, [userNotifications, readIds, profile?.uid]);

  // When user opens the dropdown, automatically mark visible items as seen/read
  const handleToggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen && profile?.uid && userNotifications.length > 0) {
      const visibleIds = userNotifications.map((n) => n.id);
      dataStore.markAllNotificationsAsRead(visibleIds, profile.uid);
      setReadIds(dataStore.getNotificationReads(profile.uid));
    }
  };

  const markAllRead = () => {
    if (!profile?.uid) return;
    const allIds = userNotifications.map((n) => n.id);
    dataStore.markAllNotificationsAsRead(allIds, profile.uid);
    setReadIds(dataStore.getNotificationReads(profile.uid));
  };

  const markSingleRead = (id: string) => {
    if (!profile?.uid) return;
    dataStore.markNotificationAsRead(id, profile.uid);
    setReadIds(dataStore.getNotificationReads(profile.uid));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        className="relative p-2 rounded-lg text-slate-600 hover:text-[#0F2A4A] hover:bg-slate-100 transition-colors focus:outline-hidden cursor-pointer"
        aria-label="View notifications"
        title={unreadCount > 0 ? `${unreadCount} unread announcements` : 'No unread notifications'}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#0F2A4A]">School Notices</span>
              {unreadCount > 0 ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                  All caught up
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-slate-600 hover:text-[#0F2A4A] flex items-center gap-1 font-medium cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {userNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No active announcements right now.
              </div>
            ) : (
              userNotifications.map((n) => {
                const isRead = readIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => markSingleRead(n.id)}
                    className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                      !isRead ? 'bg-emerald-50/40' : 'bg-white'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        !isRead ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-transparent'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            !isRead ? 'font-bold text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {n.title}
                        </p>
                        {n.priority === 'high' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 shrink-0">
                            HIGH
                          </span>
                        )}
                      </div>

                      <div
                        className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 rich-text-content"
                        dangerouslySetInnerHTML={{ __html: n.bodyHtml }}
                      />

                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {formatAnnouncementDateTime(n.startDate || n.createdAt) || 'Recent'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              to={profile?.role === 'admin' ? '/admin/notifications' : '/notifications'}
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2A4A] hover:text-emerald-600 transition-colors"
            >
              View all announcements <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
