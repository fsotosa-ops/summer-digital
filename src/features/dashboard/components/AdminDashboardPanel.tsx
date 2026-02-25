'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Route, BookOpen, Users, Trophy, BarChart3, Layers, TrendingUp } from 'lucide-react';
import { User } from '@/types';

interface AdminDashboardPanelProps {
  user: User;
}

/* ─── Data ───────────────────────────────────────────── */
const KPI_STATS = [
  { label: 'Usuarios Activos',  sub: 'Total registrados',  icon: Users,     bg: 'bg-fuchsia-50', color: 'text-fuchsia-500' },
  { label: 'Journeys',          sub: 'Publicados',          icon: Route,     bg: 'bg-sky-50',     color: 'text-sky-500'     },
  { label: 'Recursos',          sub: 'Disponibles',         icon: Layers,    bg: 'bg-teal-50',    color: 'text-teal-500'    },
  { label: 'Completados',       sub: 'Últimos 30 días',     icon: BarChart3, bg: 'bg-amber-50',   color: 'text-amber-500'   },
];

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
export function AdminDashboardPanel({ user: _user }: AdminDashboardPanelProps) {
  return (
    <div className="flex flex-col gap-5">

      {/* KPI card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">
          Estadísticas
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPI_STATS.map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-slate-800 leading-none">—</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{stat.label}</p>
                  <p className="text-[10px] text-slate-400 truncate">{stat.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
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
  );
}
