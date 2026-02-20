'use client';

import { useState, useEffect } from 'react';
import { crmService } from '@/services/crm.service';
import { ApiCrmStats, ApiCrmTask, ApiCrmTaskStatus } from '@/types/api.types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  Calendar,
  CheckCircle2,
  ArrowRight,
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

export function ActivityTab() {
  const [stats, setStats] = useState<ApiCrmStats | null>(null);
  const [tasks, setTasks] = useState<ApiCrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsResult, tasksResult] = await Promise.allSettled([
        crmService.getStats(),
        crmService.listTasks(0, 100),
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
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Contactos', value: stats?.total_contacts ?? 0,  icon: Users,         cls: 'text-slate-700', bg: 'bg-slate-100'  },
          { label: 'Activos',   value: stats?.active_contacts ?? 0, icon: UserCheck,     cls: 'text-green-600', bg: 'bg-green-100'  },
          { label: 'En Riesgo', value: stats?.risk_contacts ?? 0,   icon: AlertTriangle, cls: 'text-red-600',   bg: 'bg-red-100'    },
          { label: 'Inactivos', value: stats?.inactive_contacts ?? 0, icon: UserX,       cls: 'text-slate-500', bg: 'bg-slate-100'  },
        ].map(({ label, value, icon: Icon, cls, bg }) => (
          <Card key={label} className="rounded-2xl shadow-sm border-0 bg-white">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{label}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${cls}`}>{value}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon className={`h-5 w-5 ${cls}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Pipeline de Tareas</h3>
        <Button variant="ghost" size="sm" onClick={loadData} className="h-8 text-slate-500 hover:text-fuchsia-600">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Actualizar
        </Button>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(({ key, label, color, dot }) => {
          const col = tasksByStatus(key);
          return (
            <div key={key} className={`rounded-2xl border-t-4 ${color} bg-white shadow-sm border border-slate-100 flex flex-col`}>
              {/* Column header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{col.length}</span>
              </div>

              {/* Task cards */}
              <div className="flex-1 p-3 space-y-2 min-h-[120px]">
                {col.length === 0 ? (
                  <p className="text-xs text-slate-300 text-center pt-6">Sin tareas</p>
                ) : (
                  col.map((task) => (
                    <div
                      key={task.id}
                      className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100 hover:border-fuchsia-200 transition-colors group"
                    >
                      <p className="text-sm font-medium text-slate-800 leading-tight">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                          {PRIORITY_LABELS[task.priority] || task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                      {NEXT_STATUS[task.status] && (
                        <button
                          onClick={() => moveTask(task)}
                          disabled={movingId === task.id}
                          className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-fuchsia-600 opacity-0 group-hover:opacity-100 transition-all pt-1 border-t border-slate-100"
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
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          No hay tareas registradas en el CRM aún.
        </div>
      )}
    </div>
  );
}
