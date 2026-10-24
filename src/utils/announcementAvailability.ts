import { AppNotification, User } from '@/src/types';

export type AnnouncementLifecycleState =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'expired'
  | 'archived';

export interface AnnouncementAvailabilityInfo {
  state: AnnouncementLifecycleState;
  isAvailableForStudent: boolean; // Can student view this on their dashboard right now?
  shouldDisappearFromDashboard: boolean; // Has it expired and should automatically disappear?
  isUpcoming: boolean; // Start date is in the future
  isExpired: boolean; // End date has elapsed
  isActive: boolean; // Currently within the active time window
  timeUntilStartMs?: number;
  timeUntilExpiryMs?: number;
  timeUntilStartFormatted: string | null;
  timeRemainingFormatted: string | null;
  formattedStart: string | null;
  formattedEnd: string | null;
  formattedCountdown: string | null;
  badgeLabel: string;
  badgeColor: string;
  startDate: Date | null;
  endDate: Date | null;
  autoDisappear: boolean;
}

/**
 * Formats a Date object or ISO string into readable localized format
 */
export function formatAnnouncementDateTime(date: Date | string | null | undefined): string | null {
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
 * Formats milliseconds into human friendly countdown (e.g. "3d 4h", "2h 15m", "< 1 min")
 */
export function formatDurationHuman(ms: number): string {
  if (ms <= 0) return 'Expired';
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
    return `${minutes}m`;
  }
  return '< 1m';
}

/**
 * Calculates current availability, scheduling lifecycle, and student visibility state for an announcement
 */
export function getAnnouncementAvailability(
  announcement: AppNotification,
  now: Date = new Date()
): AnnouncementAvailabilityInfo {
  const startStr = announcement.startDate;
  const endStr = announcement.endDate || announcement.expiresAt;
  const autoDisappear = announcement.autoDisappear ?? true;
  const status = announcement.status || 'published';

  const startDate = startStr ? new Date(startStr) : null;
  const endDate = endStr ? new Date(endStr) : null;

  const validStartDate = startDate && !isNaN(startDate.getTime()) ? startDate : null;
  const validEndDate = endDate && !isNaN(endDate.getTime()) ? endDate : null;

  const nowMs = now.getTime();
  const formattedStart = validStartDate ? formatAnnouncementDateTime(validStartDate) : null;
  const formattedEnd = validEndDate ? formatAnnouncementDateTime(validEndDate) : null;

  // 1. Explicit Draft Status
  if (status === 'draft') {
    return {
      state: 'draft',
      isAvailableForStudent: false,
      shouldDisappearFromDashboard: true,
      isUpcoming: false,
      isExpired: false,
      isActive: false,
      timeUntilStartFormatted: null,
      timeRemainingFormatted: null,
      formattedStart,
      formattedEnd,
      formattedCountdown: null,
      badgeLabel: 'Draft',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      startDate: validStartDate,
      endDate: validEndDate,
      autoDisappear,
    };
  }

  // 2. Explicit Archived Status
  if (status === 'archived') {
    return {
      state: 'archived',
      isAvailableForStudent: false,
      shouldDisappearFromDashboard: true,
      isUpcoming: false,
      isExpired: true,
      isActive: false,
      timeUntilStartFormatted: null,
      timeRemainingFormatted: null,
      formattedStart,
      formattedEnd,
      formattedCountdown: null,
      badgeLabel: 'Archived',
      badgeColor: 'bg-slate-200 text-slate-600 border-slate-300',
      startDate: validStartDate,
      endDate: validEndDate,
      autoDisappear,
    };
  }

  // 3. Time-Based Scheduled (Start Date is in the future)
  if (validStartDate && nowMs < validStartDate.getTime()) {
    const timeUntilStartMs = validStartDate.getTime() - nowMs;
    const countdown = formatDurationHuman(timeUntilStartMs);

    return {
      state: 'scheduled',
      isAvailableForStudent: false, // Automated visibility: Hidden until start date arrives
      shouldDisappearFromDashboard: true, // Not visible on student dashboard yet
      isUpcoming: true,
      isExpired: false,
      isActive: false,
      timeUntilStartMs,
      timeUntilStartFormatted: countdown,
      timeRemainingFormatted: null,
      formattedStart,
      formattedEnd,
      formattedCountdown: `Broadcasts in ${countdown}`,
      badgeLabel: `Scheduled (Opens in ${countdown})`,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      startDate: validStartDate,
      endDate: validEndDate,
      autoDisappear,
    };
  }

  // 4. Time-Based Expired (End Date is in the past)
  if (validEndDate && nowMs > validEndDate.getTime()) {
    return {
      state: 'expired',
      isAvailableForStudent: false,
      shouldDisappearFromDashboard: autoDisappear, // Automatically disappears when end date passes
      isUpcoming: false,
      isExpired: true,
      isActive: false,
      timeUntilStartFormatted: null,
      timeRemainingFormatted: 'Expired',
      formattedStart,
      formattedEnd,
      formattedCountdown: 'Expired',
      badgeLabel: 'Expired Notice',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      startDate: validStartDate,
      endDate: validEndDate,
      autoDisappear,
    };
  }

  // 5. Active Notice (Now is between startDate and endDate, or no constraints set)
  let countdownText: string | null = null;
  let timeUntilExpiryMs: number | undefined;
  let timeRemainingFormatted: string | null = null;

  if (validEndDate) {
    timeUntilExpiryMs = validEndDate.getTime() - nowMs;
    const humanDuration = formatDurationHuman(timeUntilExpiryMs);
    countdownText = `Active • Expires in ${humanDuration}`;
    timeRemainingFormatted = humanDuration;
  } else {
    countdownText = 'Active (Permanent)';
    timeRemainingFormatted = 'Permanent';
  }

  return {
    state: 'active',
    isAvailableForStudent: true, // Actively visible to students right now
    shouldDisappearFromDashboard: false,
    isUpcoming: false,
    isExpired: false,
    isActive: true,
    timeUntilExpiryMs,
    timeUntilStartFormatted: null,
    timeRemainingFormatted,
    formattedStart,
    formattedEnd,
    formattedCountdown: countdownText,
    badgeLabel: countdownText,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    startDate: validStartDate,
    endDate: validEndDate,
    autoDisappear,
  };
}

/**
 * Checks whether an announcement is eligible and actively visible to a specific student
 */
export function isAnnouncementVisibleForStudent(
  announcement: AppNotification,
  studentProfile: User | null,
  now: Date = new Date()
): boolean {
  // 1. Audience verification
  if (announcement.audience.type === 'all') {
    // visible to all students
  } else if (announcement.audience.type === 'class') {
    if (!studentProfile?.classIds || !studentProfile.classIds.length) {
      return false;
    }
    const hasCommonClass = announcement.audience.ids.some((cid) =>
      studentProfile.classIds.includes(cid)
    );
    if (!hasCommonClass) return false;
  } else if (announcement.audience.type === 'user') {
    if (!studentProfile?.uid || !announcement.audience.ids.includes(studentProfile.uid)) {
      return false;
    }
  }

  // 2. Automated time-based scheduling verification
  const avail = getAnnouncementAvailability(announcement, now);
  if (!avail.isAvailableForStudent || avail.shouldDisappearFromDashboard) {
    return false;
  }

  return true;
}
