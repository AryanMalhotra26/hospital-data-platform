/**
 * Small display/format helpers shared by the list pages.
 * The DB returns dates as strings (the pool uses dateStrings:true), so these
 * work on plain strings like "2026-07-01" and "2026-07-01 14:30:00".
 */

/** "2026-07-01" -> "Jul 1, 2026" (or em-dash when empty). */
export function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** "2026-07-01 14:30:00" -> "Jul 1, 2026, 2:30 PM". */
export function formatDateTime(value) {
  if (!value) return '—';
  // No timezone in the string -> parsed as local wall-clock, which is what we
  // stored, so the displayed numbers match what was entered.
  const date = new Date(value.replace(' ', 'T'));
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "2026-07-01 14:30:00" -> "2026-07-01T14:30" for <input type="datetime-local">. */
export function toDateTimeLocal(value) {
  if (!value) return '';
  return value.replace(' ', 'T').slice(0, 16);
}

/** Human labels for the appointment status enum. */
export const STATUS_LABELS = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export const STATUS_OPTIONS = Object.keys(STATUS_LABELS);
