import React from 'react';
import {
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  CalendarCheck,
  CalendarX,
  Tag,
  Hourglass,
  Layers,
} from 'lucide-react';
import { formatQuizDateTime, formatDurationHuman } from '@/src/utils/quizAvailability';

export interface QuizScheduleValues {
  startDate: string; // ISO string e.g. "YYYY-MM-DDTHH:mm"
  endDate: string; // ISO string e.g. "YYYY-MM-DDTHH:mm"
  autoDisappearOnExpiry: boolean;
  visibilityMode: 'show_with_countdown' | 'hide_until_start';
  batchLabel: string;
}

interface QuizScheduleManagerProps {
  values: QuizScheduleValues;
  onChange: (updated: Partial<QuizScheduleValues>) => void;
  className?: string;
  isCompact?: boolean;
}

export const QuizScheduleManager: React.FC<QuizScheduleManagerProps> = ({
  values,
  onChange,
  className = '',
  isCompact = false,
}) => {
  // Helpers for quick presets
  const applyStartPreset = (type: 'now' | 'tomorrow_morning' | 'next_monday') => {
    const now = new Date();
    let target = new Date();

    if (type === 'now') {
      target = now;
    } else if (type === 'tomorrow_morning') {
      target.setDate(now.getDate() + 1);
      target.setHours(8, 0, 0, 0);
    } else if (type === 'next_monday') {
      const daysUntilMonday = ((1 + 7 - now.getDay()) % 7) || 7;
      target.setDate(now.getDate() + daysUntilMonday);
      target.setHours(9, 0, 0, 0);
    }

    const isoStr = target.toISOString().slice(0, 16);
    onChange({ startDate: isoStr });
  };

  const applyEndPreset = (hoursToAdd: number | null) => {
    if (hoursToAdd === null) {
      onChange({ endDate: '' });
      return;
    }

    const base = values.startDate ? new Date(values.startDate) : new Date();
    const target = new Date(base.getTime() + hoursToAdd * 3600 * 1000);
    const isoStr = target.toISOString().slice(0, 16);
    onChange({ endDate: isoStr });
  };

  // Compute live preview state
  const now = new Date();
  const startDt = values.startDate ? new Date(values.startDate) : null;
  const endDt = values.endDate ? new Date(values.endDate) : null;

  let liveStatus = 'Active Now (Open immediately)';
  let liveStatusColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  let studentVisibilitySummary = 'Students can currently see and take this assessment.';

  if (startDt && now.getTime() < startDt.getTime()) {
    const untilStart = startDt.getTime() - now.getTime();
    const countdown = formatDurationHuman(untilStart);
    liveStatus = `Scheduled (Opens in ${countdown})`;
    liveStatusColor = 'bg-amber-50 text-amber-900 border-amber-300';
    studentVisibilitySummary =
      values.visibilityMode === 'hide_until_start'
        ? 'Hidden from students until the start date arrives.'
        : `Visible on Student Dashboard with an "Upcoming: Opens in ${countdown}" badge. Taking is locked until open.`;
  } else if (endDt && now.getTime() > endDt.getTime()) {
    liveStatus = 'Expired / Deadline Passed';
    liveStatusColor = 'bg-rose-50 text-rose-800 border-rose-300';
    studentVisibilitySummary = values.autoDisappearOnExpiry
      ? 'Automatically disappeared from the Student Dashboard.'
      : 'Visible as closed/expired. Students cannot start new attempts.';
  } else if (endDt) {
    const untilEnd = endDt.getTime() - now.getTime();
    liveStatus = `Active (Closes in ${formatDurationHuman(untilEnd)})`;
    liveStatusColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    studentVisibilitySummary = values.autoDisappearOnExpiry
      ? `Active. When the deadline passes on ${formatQuizDateTime(endDt)}, it will automatically disappear from the Student Dashboard.`
      : `Active until ${formatQuizDateTime(endDt)}.`;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Assessment Scheduling & Automated Visibility
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </span>
      </div>

      {/* Date & Time Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date & Time */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              Start Date & Time (Opens)
            </label>
            {values.startDate && (
              <button
                type="button"
                onClick={() => onChange({ startDate: '' })}
                className="text-[11px] text-rose-600 hover:underline"
              >
                Clear (Open Now)
              </button>
            )}
          </div>

          <input
            type="datetime-local"
            value={values.startDate || ''}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A] bg-slate-50 focus:bg-white transition-colors"
          />

          {/* Quick Start Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-medium">Quick:</span>
            <button
              type="button"
              onClick={() => applyStartPreset('now')}
              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              Open Immediately
            </button>
            <button
              type="button"
              onClick={() => applyStartPreset('tomorrow_morning')}
              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              Tomorrow 8 AM
            </button>
            <button
              type="button"
              onClick={() => applyStartPreset('next_monday')}
              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              Next Monday 9 AM
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            {values.startDate
              ? `Scheduled to unlock: ${formatQuizDateTime(values.startDate)}`
              : 'No start constraint. Assessment opens immediately once published.'}
          </p>
        </div>

        {/* End Date & Time */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CalendarX className="w-4 h-4 text-rose-600" />
              End Date & Time (Closes)
            </label>
            {values.endDate && (
              <button
                type="button"
                onClick={() => onChange({ endDate: '' })}
                className="text-[11px] text-rose-600 hover:underline"
              >
                Clear (No Expiry)
              </button>
            )}
          </div>

          <input
            type="datetime-local"
            value={values.endDate || ''}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#0F2A4A] bg-slate-50 focus:bg-white transition-colors"
          />

          {/* Quick End Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-medium">Add:</span>
            <button
              type="button"
              onClick={() => applyEndPreset(2)}
              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              +2 Hours
            </button>
            <button
              type="button"
              onClick={() => applyEndPreset(24)}
              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              +1 Day
            </button>
            <button
              type="button"
              onClick={() => applyEndPreset(72)}
              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              +3 Days
            </button>
            <button
              type="button"
              onClick={() => applyEndPreset(168)}
              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              +1 Week
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            {values.endDate
              ? `Submission window closes: ${formatQuizDateTime(values.endDate)}`
              : 'No end constraint. Assessment remains permanently available.'}
          </p>
        </div>
      </div>

      {/* Automated Disappearance & Pre-Start Visibility Controls */}
      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="autoDisappear"
              checked={values.autoDisappearOnExpiry}
              onChange={(e) => onChange({ autoDisappearOnExpiry: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="autoDisappear" className="cursor-pointer">
              <span className="text-xs font-bold text-slate-800 block">
                Automated Disappearance on Expiry
              </span>
              <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                Automatically remove and hide the assessment from the Student Dashboard once the end date/deadline passes.
              </span>
            </label>
          </div>

          <span
            className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase shrink-0 ${
              values.autoDisappearOnExpiry
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {values.autoDisappearOnExpiry ? 'Auto-Hide Active' : 'Leave Visible on Expiry'}
          </span>
        </div>

        {/* Pre-Start Visibility Mode */}
        {values.startDate && (
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Hourglass className="w-3.5 h-3.5 text-amber-600" />
              Prior to Start Date:
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="visibilityMode"
                  checked={values.visibilityMode === 'show_with_countdown'}
                  onChange={() => onChange({ visibilityMode: 'show_with_countdown' })}
                  className="w-3.5 h-3.5 text-emerald-600"
                />
                <span>Show with Countdown</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="visibilityMode"
                  checked={values.visibilityMode === 'hide_until_start'}
                  onChange={() => onChange({ visibilityMode: 'hide_until_start' })}
                  className="w-3.5 h-3.5 text-emerald-600"
                />
                <span>Hide Completely</span>
              </label>
            </div>
          </div>
        )}

        {/* Batch / Cohort Badge Label */}
        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-600" />
            Batch / Cohort Badge:
          </label>
          <input
            type="text"
            placeholder="e.g. Batch 2026/2027, JSS 1 Cohort A"
            value={values.batchLabel}
            onChange={(e) => onChange({ batchLabel: e.target.value })}
            className="w-full sm:w-64 px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
          />
        </div>
      </div>

      {/* Live Preview Card */}
      <div className={`p-3 rounded-xl border ${liveStatusColor} flex items-start gap-2.5`}>
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
        <div className="text-xs">
          <div className="flex items-center gap-2">
            <strong className="font-bold">Student Dashboard Live State:</strong>
            <span className="font-bold underline">{liveStatus}</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
            {studentVisibilitySummary}
          </p>
        </div>
      </div>
    </div>
  );
};
