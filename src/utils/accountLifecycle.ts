import { UserProfile } from '@/src/types';

export function isDeveloperAccount(
  user?: Pick<UserProfile, 'uid' | 'usernameLower' | 'role'> | null
): boolean {
  if (!user) return false;
  return (
    user.role === 'developer' ||
    user.uid === 'dev-system-superuser' ||
    user.usernameLower === 'developer'
  );
}

/**
 * Parses either a YYYY-MM-DD date string (local start-of-day 00:00:00)
 * or an ISO timestamp string into epoch milliseconds.
 */
export function parseDeactivationTimestamp(value?: string | null): number | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Pure YYYY-MM-DD date string -> interpret in local timezone at 00:00:00
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function getDeactivationThreshold(
  user?: Pick<UserProfile, 'deactivationDate' | 'autoDeactivateAt'> | null
): string | null {
  if (!user) return null;
  return user.deactivationDate ?? user.autoDeactivateAt ?? null;
}

export function isAutoDeactivationDue(
  user?: Pick<UserProfile, 'uid' | 'usernameLower' | 'role' | 'deactivationDate' | 'autoDeactivateAt'> | null,
  nowMs: number = Date.now()
): boolean {
  if (!user || isDeveloperAccount(user)) return false;
  const threshold = getDeactivationThreshold(user);
  const ts = parseDeactivationTimestamp(threshold);
  if (ts === null) return false;
  return nowMs >= ts;
}

export function formatAutoDeactivateDateTime(value?: string | null): string | null {
  const ts = parseDeactivationTimestamp(value);
  if (ts === null) return null;
  const d = new Date(ts);
  const hasNonMidnightTime = d.getHours() !== 0 || d.getMinutes() !== 0;

  if (hasNonMidnightTime) {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function toDateInputAndTime(value?: string | null): { date: string; time: string } {
  const ts = parseDeactivationTimestamp(value);
  if (ts === null) {
    return { date: '', time: '00:00' };
  }
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

export function combineDateAndTimeToIso(dateStr: string, timeStr: string = '00:00'): string | null {
  const cleanDate = dateStr.trim();
  if (!cleanDate) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanDate);
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const timeMatch = /^(\d{2}):(\d{2})$/.exec((timeStr || '00:00').trim());
  const hours = timeMatch ? Number(timeMatch[1]) : 0;
  const minutes = timeMatch ? Number(timeMatch[2]) : 0;

  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (isNaN(localDate.getTime())) return null;
  return localDate.toISOString();
}

export function getScheduledDeactivationNotice(autoDeactivateAt?: string | null): string {
  const formatted = formatAutoDeactivateDateTime(autoDeactivateAt);
  if (formatted && isAutoDeactivationDue({ role: 'student', uid: '', usernameLower: '', autoDeactivateAt })) {
    return `This account was automatically deactivated on ${formatted}. Please contact your school administrator to restore access.`;
  }
  return 'Your account has been deactivated. Please contact your school administrator.';
}
