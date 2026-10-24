import React from 'react';
import {
  Calendar,
  Clock,
  EyeOff,
  Sparkles,
  Info,
  CheckCircle2,
  CalendarClock,
  Radio,
} from 'lucide-react';
import { formatAnnouncementDateTime } from '@/src/utils/announcementAvailability';

export interface AnnouncementScheduleValues {
  startDate: string; // ISO or YYYY-MM-DDTHH:mm
  endDate: string; // ISO or YYYY-MM-DDTHH:mm
  autoDisappear: boolean;
}

interface AnnouncementScheduleManagerProps {
  values: AnnouncementScheduleValues;
  onChange: (updated: Partial<AnnouncementScheduleValues>) => void;
}

export const AnnouncementScheduleManager: React.FC<AnnouncementScheduleManagerProps> = ({
  values,
  onChange,
}) => {
  // Preset handlers
  const handleSetStartImmediate = () => {
    const nowIso = new Date().toISOString().slice(0, 16);
    onChange({ startDate: nowIso });
  };

  const handleSetStartTomorrowMorning = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    onChange({ startDate: tomorrow.toISOString().slice(0, 16) });
  };

  const handleSetDurationFromStart = (hours: number) => {
    const base = values.startDate ? new Date(values.startDate) : new Date();
    const end = new Date(base.getTime() + hours * 3600 * 1000);
    onChange({
      endDate: end.toISOString().slice(0, 16),
      autoDisappear: true,
    });
  };

  const handleSetDurationDays = (days: number) => {
    handleSetDurationFromStart(days * 24);
  };

  const handleClearEndDate = () => {
    onChange({ endDate: '', autoDisappear: false });
  };

  // Compute live preview
  const now = new Date();
  const startObj = values.startDate ? new Date(values.startDate) : null;
  const endObj = values.endDate ? new Date(values.endDate) : null;

  const isStartFuture = startObj && startObj.getTime() > now.getTime();
  const isEndPast = endObj && endObj.getTime() < now.getTime();

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F2A4A] uppercase tracking-wider">
              Automated Scheduling & Time-Based Visibility
            </h4>
            <p className="text-[11px] text-slate-500">
              Configure start release and automated disappearance from the Student Dashboard.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
          <Radio className="w-3 h-3 text-emerald-600 animate-pulse" /> Live Scheduler Active
        </span>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0F2A4A]" />
              Start Date & Time (Broadcast Onset)
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSetStartImmediate}
                className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
              >
                Now
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleSetStartTomorrowMorning}
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Tomorrow 8 AM
              </button>
            </div>
          </div>

          <input
            type="datetime-local"
            value={values.startDate || ''}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A] focus:ring-1 focus:ring-[#0F2A4A]"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Leave blank or set to present time to broadcast immediately.
          </p>
        </div>

        {/* End Date */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              End Date & Time (Expiration Deadline)
            </label>
            {values.endDate && (
              <button
                type="button"
                onClick={handleClearEndDate}
                className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Clear (No Expiry)
              </button>
            )}
          </div>

          <input
            type="datetime-local"
            value={values.endDate || ''}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-[#0F2A4A] focus:ring-1 focus:ring-[#0F2A4A]"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Announcement automatically expires and disappears after this date.
          </p>
        </div>
      </div>

      {/* Quick Duration Presets */}
      <div>
        <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
          Quick Expiration Presets:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '+2 Hours', action: () => handleSetDurationFromStart(2) },
            { label: '+24 Hours', action: () => handleSetDurationDays(1) },
            { label: '+3 Days', action: () => handleSetDurationDays(3) },
            { label: '+1 Week', action: () => handleSetDurationDays(7) },
            { label: '+14 Days', action: () => handleSetDurationDays(14) },
            { label: '+30 Days', action: () => handleSetDurationDays(30) },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={preset.action}
              className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer shadow-2xs"
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClearEndDate}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer shadow-2xs ${
              !values.endDate
                ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            Permanent / No Expiration
          </button>
        </div>
      </div>

      {/* Automated Disappearance Toggle */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-start gap-3">
        <input
          type="checkbox"
          id="notifAutoDisappear"
          checked={values.autoDisappear}
          onChange={(e) => onChange({ autoDisappear: e.target.checked })}
          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
        />
        <label htmlFor="notifAutoDisappear" className="text-xs cursor-pointer select-none">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5 text-purple-600" />
            Automated Disappearance from Student Dashboard
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
            When enabled, this announcement will automatically disappear from all student dashboard feeds immediately when the expiration deadline passes.
          </span>
        </label>
      </div>

      {/* Live Preview Banner */}
      <div
        className={`p-3 rounded-lg text-xs border flex items-start gap-2.5 ${
          isEndPast
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : isStartFuture
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-current opacity-80" />
        <div className="space-y-0.5">
          <span className="font-bold block">
            {isEndPast
              ? 'Assessment / Announcement is Expired'
              : isStartFuture
              ? 'Scheduled Announcement (Upcoming)'
              : 'Broadcasting Immediately to Student Dashboard'}
          </span>
          <p className="text-[11px] opacity-90 leading-relaxed">
            {isStartFuture && (
              <>
                Students will <strong>not</strong> see this announcement on their dashboard until{' '}
                <strong>{formatAnnouncementDateTime(values.startDate)}</strong>.
              </>
            )}
            {!isStartFuture && !isEndPast && (
              <>
                Active right now for eligible students.{' '}
                {values.endDate ? (
                  <>
                    Will automatically {values.autoDisappear ? 'disappear' : 'expire'} on{' '}
                    <strong>{formatAnnouncementDateTime(values.endDate)}</strong>.
                  </>
                ) : (
                  <>No expiration set (permanent institutional notice).</>
                )}
              </>
            )}
            {isEndPast && (
              <>
                The deadline has passed. {values.autoDisappear ? 'Automatically hidden from student dashboard.' : 'Remains in read history.'}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
