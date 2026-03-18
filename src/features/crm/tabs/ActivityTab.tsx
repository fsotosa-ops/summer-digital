'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { crmService } from '@/services/crm.service';
import { ApiCrmStats, ApiCrmTask, ApiCrmTaskStatus } from '@/types/api.types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ClipboardList,
  Clock,
  FileText,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PRIORITY_COLORS: Record<string, string> = {
  low:    'bg-slate-100 text-slate-600',
  medium: 'bg-sky-100 text-sky-700',
  high:   'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente',
};

const COLUMNS: { key: ApiCrmTaskStatus; label: string; color: string; dot: string }[] = [
  { key: 'pending',     label: 'Pendientes',   color: 'border-t-amber-400',  dot: 'bg-amber-400'  },
  { key: 'in_progress', label: 'En Progreso',  color: 'border-t-blue-500',   dot: 'bg-blue-500'   },
  { key: 'completed',   label: 'Completadas',  color: 'border-t-green-500',  dot: 'bg-green-500'  },
];

const NEXT_STATUS: Record<string, ApiCrmTaskStatus> = {
  pending: 'in_progress',
  in_progress: 'completed',
};

export function ActivityTab({ orgId }: { orgId?: string }) {
  const [stats, setStats] = useState<ApiCrmStats | null>(null);
  const [tasks, setTasks] = useState<ApiCrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [orgId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsResult, tasksResult] = await Promise.allSettled([
        crmService.getStats(orgId),
        crmService.listTasks(0, 50, undefined, undefined, orgId),
      ]);
      
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value);
    } finally {
      setLoading(false);
    }
  };

  const moveTask = async (task: ApiCrmTask) => {
    const next = NEXT_STATUS[task.status];
    if (!next) return;
    setMovingId(task.id);
    try {
      const updated = await crmService.updateTask(task.id, { status: next });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success('Tarea actualizada');
      // Recargamos stats para reflejar el cambio en los contadores
      const newStats = await crmService.getStats(orgId);
      setStats(newStats);
    } catch {
      toast.error('Error al mover la tarea');
    } finally {
      setMovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const tasksByStatus = (status: ApiCrmTaskStatus) =>
    tasks.filter((t) => t.status === status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Resumen general</h3>
        <Button variant="ghost" size="sm" onClick={loadData} className="h-8 text-slate-500 hover:text-fuchsia-600">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Actualizar
        </Button>
      </div>

      {/* Hero — Total Contactos + Mini Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 rounded-2xl shadow-sm border-0 bg-gradient-to-br from-fuchsia-50 to-purple-50">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-4">
              <div>
                <p className="text-xs font-semibold text-fuchsia-600 uppercase tracking-wide mb-1">
                  Contactos
                </p>
                <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-purple-600 leading-none">
                  {stats?.total_contacts ?? 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-fuchsia-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-fuchsia-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-1 grid grid-cols-1 gap-3">
          {[
            { label: 'Activos', value: stats?.active_contacts ?? 0, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'En Riesgo', value: stats?.risk_contacts ?? 0, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl p-3 flex items-center justify-between border border-slate-100 shadow-xs">
              <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase leading-none mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {[
            { label: 'Tareas pend.', value: stats?.pending_tasks ?? 0, icon: ClipboardList, color: 'text-orange-500', bg: 'bg-orange-50' },
            { label: 'En progreso', value: stats?.in_progress_tasks ?? 0, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Completadas', value: stats?.completed_tasks ?? 0, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Notas total', value: stats?.total_notes ?? 0, icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl p-3 flex items-center gap-3 border border-slate-100 shadow-xs">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase leading-none mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Header */}
      <div className="pt-4">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Activity className="h-4 w-4 text-fuchsia-600" />
          Pipeline de Tareas
        </h3>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-8">
        {COLUMNS.map(({ key, label, color, dot }) => {
          const col = tasksByStatus(key);
          return (
            <div key={key} className={`rounded-2xl border-t-4 ${color} bg-white shadow-sm border border-slate-100 flex flex-col transition-all hover:shadow-md`}>
              {/* Column header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/30 rounded-t-2xl">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</span>
                <span className="ml-auto text-[10px] font-bold text-slate-400 bg-white border border-slate-100 rounded-full px-2 py-0.5 shadow-xs">
                  {col.length}
                </span>
              </div>

              {/* Task cards */}
              <div className="flex-1 p-3 space-y-3 min-h-[160px] bg-slate-50/10">
                {col.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full pt-8 opacity-40">
                    <ClipboardList className="h-8 w-8 text-slate-200 mb-2" />
                    <p className="text-[10px] text-slate-300 font-medium">Sin tareas</p>
                  </div>
                ) : (
                  col.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl p-3 space-y-3 border border-slate-100 shadow-sm hover:border-fuchsia-200 hover:shadow-md transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-fuchsia-400 transition-colors" />
                      
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800 leading-tight group-hover:text-fuchsia-700 transition-colors">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-0 ${PRIORITY_COLORS[task.priority]}`}>
                            {PRIORITY_LABELS[task.priority] || task.priority}
                          </Badge>
                          {task.due_date && (
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {NEXT_STATUS[task.status] && (
                        <button
                          onClick={() => moveTask(task)}
                          disabled={movingId === task.id}
                          className="w-full flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 hover:text-fuchsia-600 hover:bg-fuchsia-50 py-1.5 rounded-lg transition-all border-t border-slate-50 group-hover:border-fuchsia-100"
                        >
                          {movingId === task.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : key === 'pending' ? (
                            <><ArrowRight className="h-3 w-3" /> Mover a En Progreso</>
                          ) : (
                            <><CheckCircle2 className="h-3 w-3" /> Marcar Completada</>
                          )}
                        </button>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs">
          <Clock className="h-10 w-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium text-slate-400">No hay tareas registradas en el CRM aún.</p>
        </div>
      )}
    </div>
  );
}
