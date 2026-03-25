'use client';

import React, { useState } from 'react';
import {
  ApiCrmContact,
  ApiEnrollmentDetailResponse,
  ApiUserPointsSummary,
} from '@/types/api.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Clock,
  Trophy,
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  Circle,
  UserMinus,
} from 'lucide-react';
import { STEP_TYPE_LABELS } from './constants';

interface ActivityTabProps {
  crmContact: ApiCrmContact | null;
  enrollmentDetails: ApiEnrollmentDetailResponse[];
  gamification: ApiUserPointsSummary | null;
  activityLoading: boolean;
  expandedEnrollment: string | null;
  onToggleExpanded: (enrollmentId: string) => void;
  onUnenroll?: (enrollmentId: string) => Promise<void>;
}

export function ActivityTab({
  crmContact,
  enrollmentDetails,
  gamification,
  activityLoading,
  expandedEnrollment,
  onToggleExpanded,
  onUnenroll,
}: ActivityTabProps) {
  const [confirmingUnenroll, setConfirmingUnenroll] = useState<string | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);

  const handleUnenroll = async (enrollmentId: string) => {
    if (!onUnenroll) return;
    setUnenrolling(true);
    try {
      await onUnenroll(enrollmentId);
    } finally {
      setUnenrolling(false);
      setConfirmingUnenroll(null);
    }
  };
  if (activityLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Top row: Last seen + gamification summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Last seen */}
        {crmContact?.last_seen_at && (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <Clock className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                Última conexión
              </p>
              <p className="text-sm font-medium text-slate-700">
                {new Date(crmContact.last_seen_at).toLocaleDateString('es-CL', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        )}

        {/* Points */}
        {gamification && (
          <div className="p-4 bg-summer-yellow/10 rounded-lg border border-summer-yellow text-center">
            <p className="text-2xl font-bold text-summer-yellow">
              {gamification.total_points}
            </p>
            <p className="text-[11px] text-summer-yellow uppercase tracking-wider">
              Puntos totales
            </p>
          </div>
        )}

        {/* Level */}
        {gamification && (
          <div className="p-4 bg-summer-lavender/10 rounded-lg border border-summer-lavender text-center">
            <p className="text-sm font-bold text-summer-lavender">
              {gamification.current_level?.name || 'Sin nivel'}
            </p>
            <p className="text-[11px] text-summer-lavender uppercase tracking-wider">
              Nivel actual
            </p>
            {gamification.points_to_next_level != null && (
              <p className="text-[10px] text-summer-lavender mt-0.5">
                {gamification.points_to_next_level} pts al siguiente
              </p>
            )}
          </div>
        )}
      </div>

      {/* Rewards */}
      {gamification && gamification.rewards.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            Recompensas ({gamification.rewards.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {gamification.rewards.map((r) => (
              <Badge
                key={r.id}
                variant="outline"
                className="bg-summer-teal/10 text-summer-teal border-summer-teal"
              >
                {r.reward?.name || 'Reward'}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Journeys with step-by-step activity */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          Actividad en Journeys ({enrollmentDetails.length})
        </p>

        {enrollmentDetails.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">
            Sin inscripciones en journeys
          </p>
        ) : (
          enrollmentDetails.map((enrollment) => {
            const isExpanded = expandedEnrollment === enrollment.id;
            const journeyTitle = enrollment.journey?.title || 'Journey';
            const completedSteps = enrollment.completed_steps || enrollment.steps_progress.filter((s) => s.status === 'completed').length;
            const totalSteps = enrollment.total_steps || enrollment.steps_progress.length;

            return (
              <div
                key={enrollment.id}
                className="rounded-lg border border-slate-200 overflow-hidden"
              >
                {/* Journey card header */}
                <button
                  className="w-full flex items-center gap-3 p-4 bg-white hover:bg-slate-50 transition-colors text-left"
                  onClick={() => onToggleExpanded(enrollment.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {journeyTitle}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          enrollment.status === 'completed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : enrollment.status === 'active'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-50 text-slate-500'
                        }
                      >
                        {enrollment.status === 'active'
                          ? 'Activo'
                          : enrollment.status === 'completed'
                            ? 'Completado'
                            : enrollment.status === 'dropped'
                              ? 'Abandonado'
                              : enrollment.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <div className="flex items-center gap-2 flex-1 max-w-xs">
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-summer-teal h-1.5 rounded-full transition-all"
                            style={{ width: `${enrollment.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 shrink-0">
                          {Math.round(enrollment.progress_percentage)}%
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {completedSteps}/{totalSteps} pasos
                      </span>
                      <span className="text-xs text-slate-400">
                        Inicio:{' '}
                        {new Date(enrollment.started_at).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  {enrollment.steps_progress.length > 0 && (
                    isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )
                  )}
                </button>

                {/* Unenroll confirmation */}
                {onUnenroll && confirmingUnenroll === enrollment.id && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-t border-red-100">
                    <p className="text-xs text-red-600 flex-1">
                      Se eliminará la inscripción y todo su progreso. ¿Confirmar?
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setConfirmingUnenroll(null)}
                      disabled={unenrolling}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => handleUnenroll(enrollment.id)}
                      disabled={unenrolling}
                    >
                      {unenrolling && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Eliminar
                    </Button>
                  </div>
                )}

                {/* Unenroll trigger button */}
                {onUnenroll && confirmingUnenroll !== enrollment.id && (
                  <div className="flex justify-end px-4 py-1.5 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setConfirmingUnenroll(enrollment.id)}
                    >
                      <UserMinus className="h-3.5 w-3.5 mr-1" />
                      Desenrolar
                    </Button>
                  </div>
                )}

                {/* Step-by-step progress (expandable) */}
                {isExpanded && enrollment.steps_progress.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Detalle de pasos
                    </p>
                    <div className="space-y-1">
                      {enrollment.steps_progress.map((step, idx) => (
                        <div
                          key={step.step_id}
                          className="flex items-center gap-3 py-2 px-3 rounded-md bg-white border border-slate-100"
                        >
                          {/* Step status icon */}
                          <div className="shrink-0">
                            {step.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : step.status === 'available' ? (
                              <Circle className="h-4 w-4 text-blue-400" />
                            ) : (
                              <Lock className="h-4 w-4 text-slate-300" />
                            )}
                          </div>

                          {/* Step number */}
                          <span className="text-xs text-slate-400 font-mono w-6 shrink-0">
                            {idx + 1}.
                          </span>

                          {/* Step info */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${
                                step.status === 'completed'
                                  ? 'text-slate-700'
                                  : step.status === 'available'
                                    ? 'text-slate-600'
                                    : 'text-slate-400'
                              }`}
                            >
                              {step.title}
                            </p>
                          </div>

                          {/* Step type */}
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                          >
                            {STEP_TYPE_LABELS[step.type] || step.type}
                          </Badge>

                          {/* Points */}
                          {step.points_earned > 0 && (
                            <span className="text-xs text-summer-yellow font-medium shrink-0">
                              +{step.points_earned} pts
                            </span>
                          )}

                          {/* Completed date */}
                          {step.completed_at && (
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(step.completed_at).toLocaleDateString(
                                'es-CL',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Empty state if no data at all */}
      {!gamification && enrollmentDetails.length === 0 && (
        <p className="text-sm text-slate-400 italic text-center py-4">
          Sin datos de actividad disponibles
        </p>
      )}
    </div>
  );
}
