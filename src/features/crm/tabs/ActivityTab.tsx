'use client';

import { useState, useEffect } from 'react';
import { crmService } from '@/services/crm.service';
import { ApiCrmStats } from '@/types/api.types';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckSquare,
  Clock,
  StickyNote,
  TrendingUp,
  Activity,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ActivityTab() {
  const [stats, setStats] = useState<ApiCrmStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await crmService.getStats();
      setStats(result);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!stats) return null;

  const totalTasks = stats.total_tasks ?? 0;
  const pendingTasks = stats.pending_tasks ?? 0;
  const inProgressTasks = stats.in_progress_tasks ?? 0;
  const completedTasks = stats.completed_tasks ?? 0;
  const totalNotes = stats.total_notes ?? 0;
  const totalContacts = stats.total_contacts ?? 0;
  const activeContacts = stats.active_contacts ?? 0;
  const riskContacts = stats.risk_contacts ?? 0;
  const inactiveContacts = stats.inactive_contacts ?? 0;
  const activeRate = totalContacts > 0 ? Math.round((activeContacts / totalContacts) * 100) : 0;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Dashboard</h3>
          <p className="text-sm text-slate-500">Vista general del CRM</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="h-8 text-slate-500 hover:text-fuchsia-600 gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </Button>
      </div>

      {/* ── Section: Contactos ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-fuchsia-500 to-purple-600" />
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contactos</h4>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total"
            value={totalContacts}
            icon={Users}
            iconBg="bg-slate-100"
            iconColor="text-slate-600"
          />
          <KpiCard
            label="Activos"
            value={activeContacts}
            icon={UserCheck}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            accent="text-emerald-600"
            badge={activeRate > 0 ? `${activeRate}%` : undefined}
            badgeColor="bg-emerald-50 text-emerald-600"
          />
          <KpiCard
            label="En Riesgo"
            value={riskContacts}
            icon={AlertTriangle}
            iconBg="bg-red-100"
            iconColor="text-red-500"
            accent={riskContacts > 0 ? 'text-red-600' : undefined}
          />
          <KpiCard
            label="Inactivos"
            value={inactiveContacts}
            icon={UserX}
            iconBg="bg-slate-100"
            iconColor="text-slate-400"
          />
        </div>
      </div>

      {/* ── Section: Productividad ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Productividad</h4>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Tareas totales"
            value={totalTasks}
            icon={CheckSquare}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <KpiCard
            label="Pendientes"
            value={pendingTasks}
            icon={Clock}
            iconBg="bg-yellow-100"
            iconColor="text-yellow-600"
            accent={pendingTasks > 0 ? 'text-yellow-600' : undefined}
          />
          <KpiCard
            label="En progreso"
            value={inProgressTasks}
            icon={Activity}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
          />
          <KpiCard
            label="Completadas"
            value={completedTasks}
            icon={Zap}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            badge={taskCompletionRate > 0 ? `${taskCompletionRate}%` : undefined}
            badgeColor="bg-emerald-50 text-emerald-600"
          />
        </div>
      </div>

      {/* ── Section: Engagement metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Engagement Ring */}
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke="url(#engGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${activeRate * 0.974} 100`}
                  />
                  <defs>
                    <linearGradient id="engGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#d946ef" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-800">{activeRate}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Tasa de actividad</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeContacts} de {totalContacts} contactos activos
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">
                    {riskContacts === 0 ? 'Sin contactos en riesgo' : `${riskContacts} en riesgo`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes summary */}
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                <StickyNote className="h-8 w-8 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">Notas registradas</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{totalNotes}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Total de notas en el CRM
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── KPI Card sub-component ── */
interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accent?: string;
  badge?: string;
  badgeColor?: string;
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, accent, badge, badgeColor }: KpiCardProps) {
  return (
    <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3.5 px-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${accent || 'text-slate-800'}`}>{value}</p>
            {badge && (
              <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColor || 'bg-slate-100 text-slate-600'}`}>
                {badge}
              </span>
            )}
          </div>
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
