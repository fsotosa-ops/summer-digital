'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Route, BookOpen, Users, Layers, BarChart3, LayoutDashboard, RefreshCw } from 'lucide-react';
import { User } from '@/types';
import { ApiEventDashboardSummary } from '@/types/api.types';
import { crmService } from '@/services/crm.service';
import { adminService } from '@/services/admin.service';
import { resourceService } from '@/services/resource.service';
import { eventService } from '@/services/event.service';
import { Skeleton } from '@/components/ui/skeleton';
import { LiveEventBanner } from './event-control/LiveEventBanner';
import { EventMetricsGrid } from './event-control/EventMetricsGrid';
import { EventQuickActions } from './event-control/EventQuickActions';

interface AdminDashboardPanelProps {
  user: User;
}

interface Stats {
  users: number | null;
  journeys: number | null;
  resources: number | null;
  completions: number | null;
}

/* ─── Panel ──────────────────────────────────────────── */
export function AdminDashboardPanel({ user }: AdminDashboardPanelProps) {
  const [stats, setStats] = useState<Stats>({ users: null, journeys: null, resources: null, completions: null });
  const [eventSummary, setEventSummary] = useState<ApiEventDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const orgId = user.organizationId ?? '';

  const fetchData = (isRefresh = false) => {
    if (!orgId) return;

    if (!isRefresh) setLoading(true);
    setEventLoading(true);
    if (isRefresh) setRefreshing(true);

    // Fetch KPIs and event summary in parallel
    Promise.allSettled([
      crmService.getStats(orgId),
      adminService.listJourneys(orgId),
      resourceService.listResources(orgId, null),
      eventService.getDashboardSummary(orgId),
    ]).then(([crmResult, journeysResult, resourcesResult, eventResult]) => {
      const users = crmResult.status === 'fulfilled' ? crmResult.value.total_contacts : null;

      const journeys = journeysResult.status === 'fulfilled'
        ? journeysResult.value.filter(j => j.is_active).length
        : null;

      const resources = resourcesResult.status === 'fulfilled'
        ? resourcesResult.value.length
        : null;

      const completions = journeysResult.status === 'fulfilled'
        ? journeysResult.value.reduce((sum, j) => sum + (j.completed_enrollments ?? 0), 0)
        : null;

      setStats({ users, journeys, resources, completions });

      if (eventResult.status === 'fulfilled') {
        setEventSummary(eventResult.value);
      }

      setLoading(false);
      setEventLoading(false);
      setRefreshing(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const hasLiveEvents = eventSummary && eventSummary.live_events.length > 0;
  const liveEvent = eventSummary?.live_events[0] ?? null;

  const KPI_CARDS = [
    { label: 'Usuarios Activos', sub: 'Total registrados', icon: Users,     border: 'border-summer-pink', iconGradient: 'from-summer-pink to-summer-lavender', value: stats.users },
    { label: 'Journeys',         sub: 'Publicados',        icon: Route,     border: 'border-summer-sky',     iconGradient: 'from-summer-sky to-cyan-500',       value: stats.journeys },
    { label: 'Recursos',         sub: 'Disponibles',       icon: Layers,    border: 'border-summer-teal',    iconGradient: 'from-summer-teal to-emerald-500',       value: stats.resources },
    { label: 'Completados',      sub: 'Total acumulado',   icon: BarChart3, border: 'border-summer-yellow',   iconGradient: 'from-summer-yellow to-summer-orange',    value: stats.completions },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-summer-pink via-summer-lavender to-summer-teal" />
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-summer-pink to-summer-lavender flex items-center justify-center shrink-0">
              <LayoutDashboard size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                {hasLiveEvents ? 'Centro de Control' : 'Panel de Admin'}
              </h1>
              <p className="text-sm text-slate-500">
                {hasLiveEvents ? 'Monitoreo de eventos en vivo' : 'Vista general de tu plataforma'}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Live Event Banner / Upcoming Events */}
      <LiveEventBanner
        liveEvents={eventSummary?.live_events ?? []}
        upcomingEvents={eventSummary?.upcoming_events ?? []}
        orgId={orgId}
      />

      {/* Event Metrics — only when there are live events */}
      {hasLiveEvents && (
        <EventMetricsGrid summary={eventSummary} loading={eventLoading} />
      )}

      {/* Platform KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {KPI_CARDS.map(stat => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`bg-white rounded-2xl border ${stat.border} shadow-sm p-4 sm:p-5 flex flex-col gap-3`}
            >
              <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br ${stat.iconGradient} flex items-center justify-center shrink-0`}>
                <Icon size={20} className="text-white" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-9 w-16 mb-1" />
                ) : (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-800 leading-none"
                  >
                    {stat.value !== null ? stat.value.toLocaleString() : '—'}
                  </motion.p>
                )}
                <p className="text-sm font-medium text-slate-600 mt-1">{stat.label}</p>
                <p className="text-xs text-slate-500">{stat.sub}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions — context-aware */}
      <EventQuickActions liveEvent={liveEvent} orgId={orgId} />
    </div>
  );
}
