import React, { useState } from 'react';
import {
  Bell,
  AlertCircle,
  Clock,
  ShieldCheck,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Calendar,
  CalendarClock,
  EyeOff,
  Radio,
  RotateCcw,
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { AppNotification } from '@/src/types';
import { RichTextEditor } from '@/src/components/common/RichTextEditor';
import {
  AnnouncementScheduleManager,
  AnnouncementScheduleValues,
} from '@/src/components/announcements/AnnouncementScheduleManager';
import {
  getAnnouncementAvailability,
  formatAnnouncementDateTime,
} from '@/src/utils/announcementAvailability';
import { toast } from 'sonner';

export const AdminNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    dataStore.getNotifications()
  );
  const classes = dataStore.getClasses();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'expired'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<AppNotification | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formBodyHtml, setFormBodyHtml] = useState('');
  const [formPriority, setFormPriority] = useState<'normal' | 'high'>('normal');
  const [formAudienceType, setFormAudienceType] = useState<'all' | 'class'>('all');
  const [formClassIds, setFormClassIds] = useState<string[]>([]);

  // Scheduling State
  const [formSchedule, setFormSchedule] = useState<AnnouncementScheduleValues>({
    startDate: '',
    endDate: '',
    autoDisappear: true,
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<AppNotification | null>(null);

  const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || cid;

  const openAddModal = () => {
    setEditingNotification(null);
    setFormTitle('');
    setFormBodyHtml('<p>Official institutional announcement details...</p>');
    setFormPriority('normal');
    setFormAudienceType('all');
    setFormClassIds([]);
    const nowIso = new Date().toISOString().slice(0, 16);
    const inSevenDays = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16);
    setFormSchedule({
      startDate: nowIso,
      endDate: inSevenDays,
      autoDisappear: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (notif: AppNotification) => {
    setEditingNotification(notif);
    setFormTitle(notif.title);
    setFormBodyHtml(notif.bodyHtml);
    setFormPriority(notif.priority);
    setFormAudienceType(notif.audience.type === 'class' ? 'class' : 'all');
    setFormClassIds(notif.audience.ids || []);
    setFormSchedule({
      startDate: notif.startDate || notif.createdAt?.slice(0, 16) || '',
      endDate: notif.endDate || notif.expiresAt || '',
      autoDisappear: notif.autoDisappear ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Announcement title is required.');
      return;
    }

    const now = new Date().toISOString();

    if (editingNotification) {
      const updated: AppNotification = {
        ...editingNotification,
        title: formTitle.trim(),
        bodyHtml: formBodyHtml,
        priority: formPriority,
        audience: {
          type: formAudienceType,
          ids: formAudienceType === 'class' ? formClassIds : [],
        },
        startDate: formSchedule.startDate || null,
        endDate: formSchedule.endDate || null,
        expiresAt: formSchedule.endDate || null,
        autoDisappear: formSchedule.autoDisappear,
        status: 'published',
      };
      dataStore.saveNotification(updated);
      toast.success(`Announcement "${updated.title}" updated.`);
    } else {
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: formTitle.trim(),
        bodyHtml: formBodyHtml,
        priority: formPriority,
        audience: {
          type: formAudienceType,
          ids: formAudienceType === 'class' ? formClassIds : [],
        },
        createdBy: 'Dr. Evelyn Reed (Admin)',
        createdAt: now,
        startDate: formSchedule.startDate || null,
        endDate: formSchedule.endDate || null,
        expiresAt: formSchedule.endDate || null,
        autoDisappear: formSchedule.autoDisappear,
        status: 'published',
      };
      dataStore.saveNotification(newNotif);
      toast.success(`Announcement "${newNotif.title}" broadcasted.`);
    }

    setNotifications(dataStore.getNotifications());
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    dataStore.deleteNotification(deleteTarget.id);
    setNotifications(dataStore.getNotifications());
    setDeleteTarget(null);
    toast.success('Announcement removed.');
  };

  const handleExtendSevenDays = (notif: AppNotification) => {
    const newEnd = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16);
    const updated: AppNotification = {
      ...notif,
      endDate: newEnd,
      expiresAt: newEnd,
      autoDisappear: true,
      status: 'published',
    };
    dataStore.saveNotification(updated);
    setNotifications(dataStore.getNotifications());
    toast.success(`Extended announcement "${notif.title}" by 7 days.`);
  };

  const toggleClass = (cid: string) => {
    setFormClassIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2A4A] flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" /> School Announcements
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Broadcast institutional notices to students and class streams with time-based scheduling and automated dashboard disappearance ({notifications.length} total notices)
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Post New Announcement
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'all', label: 'All Notices', count: notifications.length },
          {
            key: 'active',
            label: 'Active Broadcasts',
            count: notifications.filter((n) => getAnnouncementAvailability(n).state === 'active').length,
          },
          {
            key: 'scheduled',
            label: 'Scheduled',
            count: notifications.filter((n) => getAnnouncementAvailability(n).state === 'scheduled').length,
          },
          {
            key: 'expired',
            label: 'Expired / Disappeared',
            count: notifications.filter((n) => getAnnouncementAvailability(n).state === 'expired').length,
          },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[#0F2A4A] text-white border-[#0F2A4A] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {notifications
          .filter((n) => {
            if (statusFilter === 'all') return true;
            const avail = getAnnouncementAvailability(n);
            if (statusFilter === 'active') return avail.state === 'active';
            if (statusFilter === 'scheduled') return avail.state === 'scheduled';
            if (statusFilter === 'expired') return avail.state === 'expired';
            return true;
          })
          .map((n) => {
            const avail = getAnnouncementAvailability(n);

            return (
              <div
                key={n.id}
                className={`bg-white p-6 rounded-xl border shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                  avail.state === 'active'
                    ? 'border-emerald-200 ring-1 ring-emerald-500/10'
                    : avail.state === 'scheduled'
                    ? 'border-blue-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        n.priority === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {n.priority === 'high' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                      {n.priority.toUpperCase()} PRIORITY
                    </span>

                    {/* Live Lifecycle State Badge */}
                    {avail.state === 'active' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        {avail.badgeLabel}
                      </span>
                    )}

                    {avail.state === 'scheduled' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        {avail.badgeLabel}
                      </span>
                    )}

                    {avail.state === 'expired' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Expired Notice
                      </span>
                    )}

                    {/* Automated Disappearance Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                        n.autoDisappear ?? true
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                      title={
                        n.autoDisappear ?? true
                          ? 'Automatically removed from student dashboard after expiration date'
                          : 'Persists in student archive'
                      }
                    >
                      <EyeOff className="w-3 h-3 text-purple-500" />
                      {n.autoDisappear ?? true
                        ? 'Auto-Disappear from Student View'
                        : 'Persistent in Archive'}
                    </span>

                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      Audience: {n.audience.type === 'all' ? 'Entire School' : `${n.audience.ids?.length || 0} Classes`}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#0F2A4A] mt-2">{n.title}</h3>

                  <div
                    className="mt-2 text-xs text-slate-600 rich-text-content"
                    dangerouslySetInnerHTML={{ __html: n.bodyHtml }}
                  />

                  {/* Scheduled Window Time Details */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs bg-slate-50/80 px-3 py-2 rounded-lg border border-slate-200/80 max-w-fit">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-[#0F2A4A]" />
                      <span className="font-semibold text-slate-700">Broadcast Start:</span>{' '}
                      {formatAnnouncementDateTime(avail.startDate || n.createdAt)}
                    </div>
                    <div className="text-slate-300">•</div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <span className="font-semibold text-slate-700">Expiration / End:</span>{' '}
                      {avail.endDate ? formatAnnouncementDateTime(avail.endDate) : 'Permanent / No End Date'}
                    </div>
                    {avail.state === 'expired' && (n.autoDisappear ?? true) && (
                      <>
                        <div className="text-slate-300">•</div>
                        <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Hidden from Student Dashboard
                        </span>
                      </>
                    )}
                  </div>

                  {n.audience.type === 'class' && n.audience.ids && n.audience.ids.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1 items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Target Classes:</span>
                      {n.audience.ids.map((cid) => (
                        <span
                          key={cid}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800"
                        >
                          {getClassName(cid)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-2.5 w-full md:w-auto">
                  <div className="flex items-center gap-1">
                    {avail.state === 'expired' && (
                      <button
                        type="button"
                        onClick={() => handleExtendSevenDays(n)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer mr-1"
                        title="Extend announcement for another 7 days"
                      >
                        <RotateCcw className="w-3 h-3 text-emerald-600" /> Extend +7d
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(n)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit announcement"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(n)}
                      className="p-1.5 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-400 block">
                    Posted {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">ID: {n.id}</span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Add / Edit Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-[#0F2A4A]">
                  {editingNotification ? 'Edit Announcement' : 'Post School Announcement'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compose, schedule, and broadcast institutional announcements to students
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body with dedicated scrollbar */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 pr-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. End of Term Examination Schedule"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as 'normal' | 'high')}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                    >
                      <option value="normal">Normal Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Target Audience
                    </label>
                    <select
                      value={formAudienceType}
                      onChange={(e) => setFormAudienceType(e.target.value as 'all' | 'class')}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A]"
                    >
                      <option value="all">Entire School</option>
                      <option value="class">Specific Classes</option>
                    </select>
                  </div>
                </div>

                {formAudienceType === 'class' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Select Target Classes
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50/50 max-h-40 overflow-y-auto">
                      {classes.map((c) => {
                        const isChecked = formClassIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer border transition-colors ${
                              isChecked
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleClass(c.id)}
                              className="rounded text-emerald-600 focus:ring-0"
                            />
                            <span className="truncate">{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Announcement Content */}
                <div>
                  <RichTextEditor
                    label="Announcement Details"
                    value={formBodyHtml}
                    onChange={setFormBodyHtml}
                    placeholder="Type official notice details, bold key deadlines, format instructions..."
                    minHeight="140px"
                  />
                </div>

                {/* Dedicated Scheduling System Component */}
                <AnnouncementScheduleManager
                  values={formSchedule}
                  onChange={(updated) => setFormSchedule((prev) => ({ ...prev, ...updated }))}
                />
              </div>

              {/* Fixed Modal Footer with Action Buttons */}
              <div className="flex justify-end gap-2 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F2A4A] hover:bg-[#163c68] text-white shadow-xs transition-colors cursor-pointer"
                >
                  {editingNotification ? 'Save Changes' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0F2A4A]">Delete Announcement?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to remove <strong>{deleteTarget.title}</strong>?
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
