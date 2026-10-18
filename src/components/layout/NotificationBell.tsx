import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';

interface SampleNotification {
  id: string;
  title: string;
  time: string;
  isRead: boolean;
  priority: 'normal' | 'high';
}

export const NotificationBell: React.FC = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SampleNotification[]>([
    {
      id: 'n1',
      title: 'Term 1 Mid-Term Assessments announced for all classes',
      time: '10m ago',
      isRead: false,
      priority: 'high',
    },
    {
      id: 'n2',
      title: 'New lesson published: "Introduction to Thermodynamics"',
      time: '2h ago',
      isRead: false,
      priority: 'normal',
    },
    {
      id: 'n3',
      title: 'Class schedule update for JSS 1 Mathematics',
      time: '1d ago',
      isRead: true,
      priority: 'normal',
    },
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markSingleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-600 hover:text-[#0F2A4A] hover:bg-slate-100 transition-colors focus:outline-hidden"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#0F2A4A]">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-slate-600 hover:text-[#0F2A4A] flex items-center gap-1 font-medium"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No notifications right now
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markSingleRead(n.id)}
                  className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                    !n.isRead ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      !n.isRead ? 'bg-emerald-500' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${!n.isRead ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              to={profile?.role === 'admin' ? '/admin/notifications' : '/notifications'}
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2A4A] hover:text-emerald-600"
            >
              View all notifications <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
