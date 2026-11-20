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

export function getReactivationThreshold(
  user?: Pick<UserProfile, 'reactivationDate'> | null
): string | null {
  if (!user) return null;
  return user.reactivationDate ?? null;
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

export function isAutoReactivationDue(
  user?: Pick<
    UserProfile,
    'uid' | 'usernameLower' | 'role' | 'status' | 'reactivationDate' | 'deactivationDate' | 'autoDeactivateAt'
  > | null,
  nowMs: number = Date.now()
): boolean {
  if (!user || isDeveloperAccount(user)) return false;
  if (user.status === 'active') return false;
  const reactTs = parseDeactivationTimestamp(getReactivationThreshold(user));
  if (reactTs === null || nowMs < reactTs) return false;

  const deactTs = parseDeactivationTimestamp(getDeactivationThreshold(user));
  if (deactTs !== null && deactTs > reactTs && nowMs >= deactTs) {
    return false;
  }
  return true;
}

export interface LifecycleEvaluationResult {
  changed: boolean;
  nextStatus: 'active' | 'inactive';
  nextReactivationDate: string | null;
  nextDeactivationDate: string | null;
  event: 'activated' | 'deactivated' | null;
}

/**
 * Resolves chronological reactivationDate + deactivationDate transitions cleanly without
 * causing infinite toggle loops after a reactivation timestamp is consumed.
 */
export function evaluateAccountLifecycle(
  user: Pick<
    UserProfile,
    'uid' | 'usernameLower' | 'role' | 'status' | 'reactivationDate' | 'deactivationDate' | 'autoDeactivateAt'
  >,
  nowMs: number = Date.now()
): LifecycleEvaluationResult {
  if (isDeveloperAccount(user)) {
    const changed =
      user.status !== 'active' ||
      Boolean(user.reactivationDate) ||
      Boolean(user.deactivationDate) ||
      Boolean(user.autoDeactivateAt);
    return {
      changed,
      nextStatus: 'active',
      nextReactivationDate: null,
      nextDeactivationDate: null,
      event: null,
    };
  }

  const rawReact = getReactivationThreshold(user);
  const rawDeact = getDeactivationThreshold(user);
  const reactTs = parseDeactivationTimestamp(rawReact);
  const deactTs = parseDeactivationTimestamp(rawDeact);

  let nextStatus: 'active' | 'inactive' = user.status;
  let nextReact = rawReact;
  let nextDeact = rawDeact;
  let event: 'activated' | 'deactivated' | null = null;

  if (user.status === 'inactive') {
    if (reactTs !== null && nowMs >= reactTs) {
      if (deactTs !== null && deactTs > reactTs && nowMs >= deactTs) {
        // Reactivation window opened and subsequent deactivation already passed
        nextStatus = 'inactive';
        nextReact = null;
        event = null;
      } else {
        // Account is due for automatic reactivation
        nextStatus = 'active';
        nextReact = null;
        if (deactTs !== null && deactTs <= reactTs) {
          nextDeact = null;
        }
        event = 'activated';
      }
    }
  } else {
    // Currently active: check if deactivation threshold has arrived
    if (deactTs !== null && nowMs >= deactTs) {
      if (reactTs !== null && reactTs > deactTs && nowMs >= reactTs) {
        // Scheduled reactivation came after the old deactivation threshold
        nextStatus = 'active';
        nextReact = null;
        nextDeact = null;
      } else {
        nextStatus = 'inactive';
        nextDeact = rawDeact;
        if (reactTs !== null && reactTs <= deactTs) {
          nextReact = null;
        }
        event = 'deactivated';
      }
    }
  }

  const changed =
    nextStatus !== user.status ||
    nextReact !== (user.reactivationDate ?? null) ||
    nextDeact !== (user.deactivationDate ?? null) ||
    nextDeact !== (user.autoDeactivateAt ?? null);

  return {
    changed,
    nextStatus,
    nextReactivationDate: nextReact,
    nextDeactivationDate: nextDeact,
    event,
  };
}

export function isOldOrDormantAccount(
  user?: Pick<UserProfile, 'uid' | 'usernameLower' | 'role' | 'status' | 'lastLoginAt' | 'createdAt'> | null,
  dormantDays: number = 30,
  nowMs: number = Date.now()
): boolean {
  if (!user || isDeveloperAccount(user)) return false;
  if (user.status === 'inactive') return true;
  const referenceIso = user.lastLoginAt || user.createdAt;
  if (!referenceIso) return true;
  const refTs = new Date(referenceIso).getTime();
  if (Number.isNaN(refTs)) return false;
  const diffDays = (nowMs - refTs) / (1000 * 60 * 60 * 24);
  return diffDays >= dormantDays;
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

export const formatLifecycleDateTime = formatAutoDeactivateDateTime;

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

export function getScheduledDeactivationNotice(
  autoDeactivateAt?: string | null,
  reactivationDate?: string | null
): string {
  const formattedDeact = formatAutoDeactivateDateTime(autoDeactivateAt);
  const formattedReact = formatAutoDeactivateDateTime(reactivationDate);
  const reactTs = parseDeactivationTimestamp(reactivationDate);
  const hasFutureReactivation = formattedReact && reactTs !== null && reactTs > Date.now();

  if (formattedDeact && isAutoDeactivationDue({ role: 'student', uid: '', usernameLower: '', autoDeactivateAt })) {
    return hasFutureReactivation
      ? `This account was automatically deactivated on ${formattedDeact} and is scheduled to reactivate on ${formattedReact}.`
      : `This account was automatically deactivated on ${formattedDeact}. Please contact your school administrator to restore access.`;
  }
  if (hasFutureReactivation) {
    return `Your account is currently deactivated and scheduled to automatically reactivate on ${formattedReact}.`;
  }
  return 'Your account has been deactivated. Please contact your school administrator.';
}
