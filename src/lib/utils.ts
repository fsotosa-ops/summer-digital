import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Converts a human-readable string to a URL-safe slug (handles accented characters). */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// SessionStorage keys — single source of truth to avoid magic strings
// ---------------------------------------------------------------------------
export const SESSION_KEYS = {
  QR_RETURN_URL: 'qr_return_url',
  ONBOARDING_CHECKED: 'onboarding_checked',
  JOIN_EVENT: 'OASIS_JOIN_EVENT_ID',
} as const;

const RTF = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('es', { numeric: 'auto' }) : null;

/** "Hace 2h", "Ayer", "Hace 3 días". Acepta string ISO o Date. */
export function formatRelativeTime(input: string | Date | null | undefined): string {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  if (!RTF) return date.toLocaleDateString('es-CL');
  if (abs < 60) return RTF.format(diffSec, 'second');
  if (abs < 3600) return RTF.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return RTF.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 7) return RTF.format(Math.round(diffSec / 86400), 'day');
  if (abs < 86400 * 30) return RTF.format(Math.round(diffSec / (86400 * 7)), 'week');
  if (abs < 86400 * 365) return RTF.format(Math.round(diffSec / (86400 * 30)), 'month');
  return RTF.format(Math.round(diffSec / (86400 * 365)), 'year');
}
