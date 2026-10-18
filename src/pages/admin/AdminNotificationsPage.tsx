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
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { AppNotification } from '@/src/types';
import { RichTextEditor } from '@/src/components/common/RichTextEditor';
import { toast } from 'sonner';

export const AdminNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    dataStore.getNotifications()
  );
  const classes = dataStore.getClasses();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<AppNotification | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formBodyHtml, setFormBodyHtml] = useState('');
  const [formPriority, setFormPriority] = useState<'normal' | 'high'>('normal');
  const [formAudienceType, setFormAudienceType] = useState<'all' | 'class'>('all');
  const [formClassIds, setFormClassIds] = useState<string[]>([]);

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
    setIsModalOpen(true);
  };

  const openEditModal = (notif: AppNotification) => {
    setEditingNotification(notif);
    setFormTitle(notif.title);
    setFormBodyHtml(notif.bodyHtml);
    setFormPriority(notif.priority);
    setFormAudienceType(notif.audience.type === 'class' ? 'class' : 'all');
    setFormClassIds(notif.audience.ids || []);
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
        expiresAt: null,
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
            Broadcast institutional notices to students and class streams ({notifications.length} active notices)
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#163c68] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Post New Announcement
        </button>
      </div>

      <div className="space-y-4">
        {notifications.map((n) => {
          return (
            <div
              key={n.id}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-start justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
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

                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                    Audience: {n.audience.type === 'all' ? 'Entire School' : `${n.audience.ids?.length || 0} Classes`}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#0F2A4A] mt-2">{n.title}</h3>

                <div
                  className="mt-2 text-xs text-slate-600 rich-text-content"
                  dangerouslySetInnerHTML={{ __html: n.bodyHtml }}
                />

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

              <div className="text-right shrink-0 flex flex-col items-end gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(n)}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Edit announcement"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(n)}
                    className="p-1.5 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-slate-400 block">
                  Posted {new Date(n.createdAt).toLocaleDateString()}
                </span>
                <span className="text-[10px] text-slate-400 block">ID: {n.id}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-[#0F2A4A]">
                  {editingNotification ? 'Edit Announcement' : 'Post School Announcement'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compose and broadcast announcements with rich formatting
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

                <div>
                  <RichTextEditor
                    label="Announcement Details"
                    value={formBodyHtml}
                    onChange={setFormBodyHtml}
                    placeholder="Type official notice details, bold key deadlines, format instructions..."
                    minHeight="160px"
                  />
                </div>
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
