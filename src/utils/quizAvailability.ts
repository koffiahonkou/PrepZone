import { Quiz } from '@/src/types';

export type QuizLifecycleState = 'draft' | 'scheduled' | 'active' | 'expired' | 'closed';

export interface QuizAvailabilityInfo {
  state: QuizLifecycleState;
  isAvailableForStudent: boolean; // Can student actively open/take the assessment?
  shouldDisappearFromDashboard: boolean; // Should quiz be completely hidden from student dashboard based on time/status?
  isDisappeared: boolean; // Whether the quiz is hidden due to automated disappearance
  message: string;
  badgeLabel: string;
  badgeColor: string;
  startDate: Date | null;
  endDate: Date | null;
  timeUntilStartMs?: number;
  timeUntilExpiryMs?: number;
  timeUntilStartFormatted: string | null;
  timeRemainingFormatted: string | null;
  formattedStart: string | null;
  formattedEnd: string | null;
  formattedCountdown: string | null;
  batchLabel: string;
  isAutoDisappearEnabled: boolean;
  isUpcoming: boolean;
  isExpired: boolean;
  isActive: boolean;
  isClosed: boolean;
}

/**
 * Formats a Date object into a readable date and time string
 */
export function formatQuizDateTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return null;
  }
}

/**
 * Formats milliseconds into human friendly countdown (e.g. "2d 4h", "45 mins", "Just now")
 */
export function formatDurationHuman(ms: number): string {
  if (ms <= 0) return 'Deadline passed';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes} mins`;
  }
  return '< 1 min';
}

/**
 * Calculates current availability, scheduling lifecycle, and student visibility state for a quiz
 */
export function getQuizAvailability(quiz: Quiz, now: Date = new Date()): QuizAvailabilityInfo {
  const startStr = quiz.startDate || quiz.settings?.startDate;
  const endStr = quiz.endDate || quiz.settings?.endDate;
  const autoDisappear = quiz.settings?.autoDisappearOnExpiry ?? true;
  const batchLabel = quiz.batchLabel || quiz.settings?.batchLabel || 'Active Batch';
  const visibilityMode = quiz.settings?.visibilityMode || 'show_with_countdown';

  const startDate = startStr ? new Date(startStr) : null;
  const endDate = endStr ? new Date(endStr) : null;

  const validStartDate = startDate && !isNaN(startDate.getTime()) ? startDate : null;
  const validEndDate = endDate && !isNaN(endDate.getTime()) ? endDate : null;

  const nowMs = now.getTime();
  const formattedStart = validStartDate ? formatQuizDateTime(validStartDate) : null;
  const formattedEnd = validEndDate ? formatQuizDateTime(validEndDate) : null;

  // 1. Explicit Draft Status
  if (quiz.status === 'draft') {
    return {
      state: 'draft',
      isAvailableForStudent: false,
      shouldDisappearFromDashboard: true,
      isDisappeared: true,
      message: 'Draft - Hidden from students until published',
      badgeLabel: 'Draft',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      startDate: validStartDate,
      endDate: validEndDate,
      timeUntilStartFormatted: null,
      timeRemainingFormatted: null,
      formattedStart,
      formattedEnd,
      formattedCountdown: null,
      batchLabel,
      isAutoDisappearEnabled: autoDisappear,
      isUpcoming: false,
      isExpired: false,
      isActive: false,
      isClosed: false,
    };
  }

  // 2. Explicit Deactivated / Closed Status
  if (quiz.status === 'closed' || quiz.isActive === false) {
    return {
      state: 'closed',
      isAvailableForStudent: false,
      shouldDisappearFromDashboard: autoDisappear, // automatically disappears if autoDisappear enabled
      isDisappeared: autoDisappear,
      message: 'Deactivated / Closed by teacher',
      badgeLabel: 'Deactivated',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      startDate: validStartDate,
      endDate: validEndDate,
      timeUntilStartFormatted: null,
      timeRemainingFormatted: null,
      formattedStart,
      formattedEnd,
      formattedCountdown: null,
      batchLabel,
      isAutoDisappearEnabled: autoDisappear,
      isUpcoming: false,
      isExpired: false,
      isActive: false,
      isClosed: true,
    };
  }

  // 3. Time-Based Scheduled (Start Date in Future)
  if (validStartDate && nowMs < validStartDate.getTime()) {
    const timeUntilStartMs = validStartDate.getTime() - nowMs;
    const countdown = formatDurationHuman(timeUntilStartMs);
    const shouldDisappear = visibilityMode === 'hide_until_start';

    return {
      state: 'scheduled',
      isAvailableForStudent: false,
      shouldDisappearFromDashboard: shouldDisappear,
      isDisappeared: shouldDisappear,
      message: `Scheduled to open ${formattedStart} (in ${countdown})`,
      badgeLabel: `Upcoming (Opens in ${countdown})`,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      startDate: validStartDate,
      endDate: validEndDate,
      timeUntilStartMs,
      timeUntilStartFormatted: countdown,
      timeRemainingFormatted: null,
      formattedStart,
      formattedEnd,
      formattedCountdown: `Opens in ${countdown}`,
      batchLabel,
      isAutoDisappearEnabled: autoDisappear,
      isUpcoming: true,
      isExpired: false,
      isActive: false,
      isClosed: false,
    };
  }

  // 4. Time-Based Expired (End Date in Past)
  if (validEndDate && nowMs > validEndDate.getTime()) {
    return {
      state: 'expired',
      isAvailableForStudent: false,
      shouldDisappearFromDashboard: autoDisappear, // Automated disappearance when end date passes
      isDisappeared: autoDisappear,
      message: `Assessment window closed on ${formattedEnd}`,
      badgeLabel: 'Expired / Closed',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      startDate: validStartDate,
      endDate: validEndDate,
      timeUntilStartFormatted: null,
      timeRemainingFormatted: 'Deadline passed',
      formattedStart,
      formattedEnd,
      formattedCountdown: 'Expired',
      batchLabel,
      isAutoDisappearEnabled: autoDisappear,
      isUpcoming: false,
      isExpired: true,
      isActive: false,
      isClosed: true,
    };
  }

  // 5. Active Assessment
  let countdownText: string | null = null;
  let timeUntilExpiryMs: number | undefined;
  let timeRemainingFormatted: string | null = null;

  if (validEndDate) {
    timeUntilExpiryMs = validEndDate.getTime() - nowMs;
    const humanDuration = formatDurationHuman(timeUntilExpiryMs);
    countdownText = `Closes in ${humanDuration}`;
    timeRemainingFormatted = humanDuration;
  }

  return {
    state: 'active',
    isAvailableForStudent: true,
    shouldDisappearFromDashboard: false,
    isDisappeared: false,
    message: validEndDate ? `Available until ${formattedEnd}` : 'Open - No deadline set',
    badgeLabel: countdownText ? `Active (${countdownText})` : 'Active Assessment',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    startDate: validStartDate,
    endDate: validEndDate,
    timeUntilExpiryMs,
    timeUntilStartFormatted: null,
    timeRemainingFormatted,
    formattedStart,
    formattedEnd,
    formattedCountdown: countdownText,
    batchLabel,
    isAutoDisappearEnabled: autoDisappear,
    isUpcoming: false,
    isExpired: false,
    isActive: true,
    isClosed: false,
  };
}
