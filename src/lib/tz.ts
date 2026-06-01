/**
 * Converts a UTC ISO string to a "YYYY-MM-DDTHH:mm" string in the given timezone,
 * suitable for use as the value of an <input type="datetime-local">.
 */
export function utcToLocalInput(utcIso: string, timezone: string): string {
  const date = new Date(utcIso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const h = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}`;
}

/**
 * Converts a "YYYY-MM-DDTHH:mm" string (wall-clock time in the given timezone)
 * to a UTC ISO string.
 */
export function localInputToUtcIso(localStr: string, timezone: string): string {
  // Treat the input as UTC to bootstrap the calculation
  const approxUtc = new Date(`${localStr}:00Z`);

  // What does that UTC moment look like in the target timezone?
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(approxUtc);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const h = get('hour') === '24' ? '00' : get('hour');
  const displayedInTz = `${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}`;

  // Offset = (what we want) − (what UTC showed in tz)
  const wantedMs = new Date(`${localStr}:00Z`).getTime();
  const gotMs = new Date(`${displayedInTz}:00Z`).getTime();

  return new Date(approxUtc.getTime() + (wantedMs - gotMs)).toISOString();
}

export const TIMEZONE_OPTIONS = [
  { value: 'America/Santiago', label: 'Chile (Santiago)' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá)' },
  { value: 'America/Lima', label: 'Perú (Lima)' },
  { value: 'America/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { value: 'America/Caracas', label: 'Venezuela (Caracas)' },
  { value: 'America/Sao_Paulo', label: 'Brasil (São Paulo)' },
  { value: 'America/New_York', label: 'EE.UU. Este (Nueva York)' },
  { value: 'Europe/Madrid', label: 'España (Madrid)' },
  { value: 'UTC', label: 'UTC' },
] as const;
