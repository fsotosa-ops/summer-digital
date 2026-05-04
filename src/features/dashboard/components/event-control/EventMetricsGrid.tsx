'use client';

import { motion } from 'framer-motion';
import { Users, UserCheck, UserX, Monitor, MapPin, Smartphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiEventDashboardSummary } from '@/types/api.types';

interface EventMetricsGridProps {
  summary: ApiEventDashboardSummary | null;
  loading: boolean;
}

const MODALITY_ICONS: Record<string, typeof Monitor> = {
  presencial: MapPin,
  online: Monitor,
  hibrido: Smartphone,
};

const MODALITY_LABELS: Record<string, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Híbrido',
};

export function EventMetricsGrid({ summary, loading }: EventMetricsGridProps) {
  const hasLive = summary && summary.live_events.length > 0;

  if (!hasLive) return null;

  const { total_registered, total_attended } = summary.totals;
  const participationRate = total_registered > 0
    ? Math.round((total_attended / total_registered) * 100)
    : 0;

  // Aggregate modality breakdown across all live events
  const modalityTotals: Record<string, number> = {};
  for (const event of summary.live_events) {
    for (const [mod, count] of Object.entries(event.modality_breakdown)) {
      modalityTotals[mod] = (modalityTotals[mod] || 0) + count;
    }
  }

  const noShowTotal = summary.live_events.reduce((sum, e) => sum + e.no_show_count, 0);

  const metrics = [
    {
      label: 'Registrados',
      value: total_registered,
      icon: Users,
      gradient: 'from-sky-500 to-blue-600',
      border: 'border-sky-100',
    },
    {
      label: 'Check-ins',
      value: total_attended,
      icon: UserCheck,
      gradient: 'from-emerald-500 to-green-600',
      border: 'border-emerald-100',
    },
    {
      label: 'Participación',
      value: `${participationRate}%`,
      icon: Users,
      gradient: 'from-fuchsia-500 to-purple-600',
      border: 'border-fuchsia-100',
    },
    {
      label: 'No-show',
      value: noShowTotal,
      icon: UserX,
      gradient: 'from-amber-500 to-orange-500',
      border: 'border-amber-100',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Event Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(metric => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`bg-white rounded-2xl border ${metric.border} shadow-sm p-4 flex flex-col gap-2`}
            >
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${metric.gradient} flex items-center justify-center shrink-0`}>
                <Icon size={18} className="text-white" />
              </div>
              {loading ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold tabular-nums text-slate-800 leading-none"
                >
                  {metric.value}
                </motion.p>
              )}
              <p className="text-xs font-medium text-slate-500">{metric.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Modality breakdown */}
      {Object.keys(modalityTotals).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            Por modalidad
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
            {Object.entries(modalityTotals).map(([mod, count]) => {
              const Icon = MODALITY_ICONS[mod] || Users;
              return (
                <div key={mod} className="flex items-center gap-2">
                  <Icon size={14} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700 tabular-nums">{count}</span>
                  <span className="text-xs text-slate-400">{MODALITY_LABELS[mod] || mod}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
