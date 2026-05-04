'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Radio, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { ApiEventDashboardSummaryItem } from '@/types/api.types';

interface LiveEventBannerProps {
  liveEvents: ApiEventDashboardSummaryItem[];
  upcomingEvents: ApiEventDashboardSummaryItem[];
  orgId: string;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function LiveCard({ event, orgId }: { event: ApiEventDashboardSummaryItem; orgId: string }) {
  const total = event.registered_count + event.attended_count;
  const checkedIn = event.attended_count;
  const pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  return (
    <Link href={`/crm?tab=events&event=${event.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
      >
        {/* Live badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider">En Vivo</span>
          </div>
          <ChevronRight size={18} className="text-white/60" />
        </div>

        {/* Event name */}
        <h3 className="text-lg font-bold leading-tight mb-1 truncate">{event.name}</h3>
        {event.location && (
          <p className="text-white/70 text-xs flex items-center gap-1 mb-4">
            <MapPin size={12} /> {event.location}
          </p>
        )}

        {/* Check-in progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/80">Check-ins</span>
            <span className="font-bold tabular-nums">
              {checkedIn} / {total}
              {event.expected_participants ? ` (esp. ${event.expected_participants})` : ''}
            </span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-white/60 tabular-nums">{pct}% de participación</p>
        </div>
      </motion.div>
    </Link>
  );
}

function UpcomingCard({ event }: { event: ApiEventDashboardSummaryItem }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shrink-0">
        <Calendar size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-700 truncate">{event.name}</p>
        <p className="text-xs text-slate-400">
          {formatDate(event.start_date)}
          {event.registered_count > 0 && ` · ${event.registered_count} registrados`}
        </p>
      </div>
    </div>
  );
}

export function LiveEventBanner({ liveEvents, upcomingEvents, orgId }: LiveEventBannerProps) {
  if (liveEvents.length === 0 && upcomingEvents.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Live events */}
      {liveEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {liveEvents.map(event => (
            <LiveCard key={event.id} event={event} orgId={orgId} />
          ))}
        </div>
      )}

      {/* Upcoming — only show when no live events */}
      {liveEvents.length === 0 && upcomingEvents.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-1">
            Próximos eventos
          </p>
          {upcomingEvents.slice(0, 3).map(event => (
            <UpcomingCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
