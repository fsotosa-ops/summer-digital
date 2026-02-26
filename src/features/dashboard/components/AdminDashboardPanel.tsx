'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Route, BookOpen, Users, Trophy, BarChart3, Layers, TrendingUp, LayoutDashboard } from 'lucide-react';
import { User } from '@/types';
import { crmService } from '@/services/crm.service';
import { adminService } from '@/services/admin.service';
import { resourceService } from '@/services/resource.service';

interface AdminDashboardPanelProps {
  user: User;
}

interface Stats {
  users: number | null;
  journeys: number | null;
  resources: number | null;
  completions: number | null;
}

const QUICK_ACTIONS = [
  {
    label: 'Crear Journey',
    description: 'Diseña experiencias de aprendizaje',
    href: '/admin/journeys',
    icon: Route,
    gradient: 'from-fuchsia-500 to-purple-600',
  },
  {
    label: 'Publicar Recurso',
    description: 'Sube videos, PDFs y cápsulas',
    href: '/admin/resources',
    icon: BookOpen,
    gradient: 'from-sky-400 to-blue-500',
  },
  {
    label: 'CRM',
    description: 'Gestiona contactos y pipeline',
    href: '/crm',
    icon: Users,
    gradient: 'from-teal-400 to-cyan-500',
  },
  {
    label: 'Gamificación',
    description: 'Puntos, rangos y recompensas',
    href: '/admin/gamification',
    icon: Trophy,
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    label: 'Analítica',
    description: 'Métricas y reportes de la plataforma',
    href: '/analytics',
    icon: TrendingUp,
    gradient: 'from-emerald-400 to-green-500',
  },
];

/* ─── Panel ──────────────────────────────────────────── */
export function AdminDashboardPanel({ user }: AdminDashboardPanelProps) {
  const [stats, setStats] = useState<Stats>({ users: null, journeys: null, resources: null, completions: null });
  const [loading, setLoading] = useState(true);

  const orgId = user.organizationId ?? '';

  useEffect(() => {
    if (!orgId) return;

    setLoading(true);

    Promise.allSettled([
      crmService.getStats(orgId),
      adminService.listJourneys(orgId),
      resourceService.listResources(orgId, null),
    ]).then(([crmResult, journeysResult, resourcesResult]) => {
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
      setLoading(false);
    });
  }, [orgId]);

  const KPI_CARDS = [
    { label: 'Usuarios Activos', sub: 'Total registrados', icon: Users,     border: 'border-fuchsia-100', iconGradient: 'from-fuchsia-500 to-purple-600', value: stats.users },
    { label: 'Journeys',         sub: 'Publicados',        icon: Route,     border: 'border-sky-100',     iconGradient: 'from-sky-500 to-blue-600',       value: stats.journeys },
    { label: 'Recursos',         sub: 'Disponibles',       icon: Layers,    border: 'border-teal-100',    iconGradient: 'from-teal-500 to-cyan-600',       value: stats.resources },
    { label: 'Completados',      sub: 'Total acumulado',   icon: BarChart3, border: 'border-amber-100',   iconGradient: 'from-amber-500 to-orange-500',    value: stats.completions },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-teal-400" />
        <div className="p-6 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shrink-0">
            <LayoutDashboard size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800">Panel de Admin</h1>
            <p className="text-sm text-slate-500">Vista general de tu plataforma</p>
          </div>
        </div>
      </div>

      {/* KPI cards — individual, no container */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map(stat => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`bg-white rounded-2xl border ${stat.border} shadow-sm p-5 flex flex-col gap-3`}
            >
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.iconGradient} flex items-center justify-center shrink-0`}>
                <Icon size={20} className="text-white" />
              </div>
              <div>
                {loading ? (
                  <div className="h-9 w-16 bg-slate-200 rounded animate-pulse mb-1" />
                ) : (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-3xl font-bold tabular-nums text-slate-800 leading-none"
                  >
                    {stat.value !== null ? stat.value.toLocaleString() : '—'}
                  </motion.p>
                )}
                <p className="text-sm font-medium text-slate-600 mt-1">{stat.label}</p>
                <p className="text-xs text-slate-400">{stat.sub}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-teal-400" />
        <div className="p-6">
          <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {QUICK_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Link href={action.href} className="block h-full">
                    <div className="bg-slate-50 hover:bg-slate-100 rounded-xl p-4 flex flex-col items-center text-center gap-3 h-full transition-colors cursor-pointer">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shrink-0`}>
                        <Icon size={22} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{action.label}</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{action.description}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
