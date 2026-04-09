import { ApiEventStatus } from '@/types/api.types';

export function eventStatusLabel(status: ApiEventStatus): string {
  const map: Record<ApiEventStatus, string> = {
    upcoming: 'Próximo',
    live: 'En vivo',
    past: 'Finalizado',
    cancelled: 'Cancelado',
  };
  return map[status] ?? status;
}

export function eventStatusClasses(status: ApiEventStatus): string {
  const map: Record<ApiEventStatus, string> = {
    live: 'bg-summer-pink/10 text-summer-pink border-summer-pink',
    upcoming: 'bg-summer-lavender/10 text-summer-lavender border-summer-lavender',
    past: 'bg-slate-100 text-slate-500 border-slate-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  };
  return map[status] ?? 'bg-slate-100 text-slate-500 border-slate-200';
}

export function categoryBadgeClasses(cat: string): string {
  const key = cat.toLowerCase();
  const map: Record<string, string> = {
    liderazgo: 'bg-summer-pink/10 text-summer-pink border-summer-pink',
    bienestar: 'bg-summer-teal/10 text-summer-teal border-summer-teal',
    innovacion: 'bg-summer-yellow/10 text-summer-yellow border-summer-yellow',
    comunidad: 'bg-summer-sky/10 text-summer-sky border-summer-sky',
  };
  return map[key] ?? 'bg-slate-100 text-slate-600 border-slate-200';
}

export function formatDateRange(start?: string | null, end?: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt((start ?? end) as string);
}
