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
