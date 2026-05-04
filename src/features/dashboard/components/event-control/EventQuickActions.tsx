'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Route,
  BookOpen,
  Users,
  Trophy,
  TrendingUp,
  QrCode,
  ClipboardList,
} from 'lucide-react';
import { ApiEventDashboardSummaryItem } from '@/types/api.types';

interface EventQuickActionsProps {
  liveEvent: ApiEventDashboardSummaryItem | null;
  orgId: string;
}

const BASE_ACTIONS = [
  {
    label: 'Crear Journey',
    description: 'Diseña experiencias de aprendizaje',
    href: '/admin/journeys',
    icon: Route,
    gradient: 'from-summer-pink to-summer-lavender',
  },
  {
    label: 'Publicar Recurso',
    description: 'Sube videos, PDFs y cápsulas',
    href: '/admin/resources',
    icon: BookOpen,
    gradient: 'from-summer-sky to-cyan-500',
  },
  {
    label: 'CRM',
    description: 'Gestiona contactos y pipeline',
    href: '/crm',
    icon: Users,
    gradient: 'from-summer-teal to-emerald-500',
  },
  {
    label: 'Gamificación',
    description: 'Puntos, rangos y recompensas',
    href: '/admin/gamification',
    icon: Trophy,
    gradient: 'from-summer-yellow to-summer-orange',
  },
  {
    label: 'Analítica',
    description: 'Métricas y reportes de la plataforma',
    href: '/analytics',
    icon: TrendingUp,
    gradient: 'from-summer-teal to-summer-sky',
  },
];

export function EventQuickActions({ liveEvent, orgId }: EventQuickActionsProps) {
  // Build contextual actions for live event
  const eventActions = liveEvent
    ? [
        {
          label: 'Ver Asistentes',
          description: `${liveEvent.registered_count + liveEvent.attended_count} registrados`,
          href: `/crm?tab=events&event=${liveEvent.id}`,
          icon: ClipboardList,
          gradient: 'from-rose-500 to-red-600',
        },
        {
          label: 'Check-in QR',
          description: 'Escanear código de entrada',
          href: `/events/${liveEvent.slug}`,
          icon: QrCode,
          gradient: 'from-violet-500 to-purple-600',
        },
      ]
    : [];

  const allActions = [...eventActions, ...BASE_ACTIONS];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-summer-pink via-summer-lavender to-summer-teal" />
      <div className="p-4 sm:p-6">
        <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {allActions.map(action => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.label}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Link href={action.href} className="block h-full">
                  <div className="bg-slate-50 hover:bg-slate-100 rounded-xl p-4 flex flex-row sm:flex-col items-center text-left sm:text-center gap-3 min-h-[64px] h-full transition-colors cursor-pointer">
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
