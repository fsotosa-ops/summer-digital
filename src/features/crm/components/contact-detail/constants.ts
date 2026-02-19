import {
  ApiAccountStatus,
  ApiCrmTaskStatus,
  ApiCrmTaskPriority,
  ApiFieldOption,
  ApiUser,
} from '@/types/api.types';

export const STATUS_OPTIONS: { value: ApiAccountStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'pending_verification', label: 'Pendiente' },
  { value: 'deleted', label: 'Eliminado' },
];

export const STATUS_COLORS: Record<ApiAccountStatus, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  pending_verification: 'bg-yellow-100 text-yellow-800',
  deleted: 'bg-slate-100 text-slate-800',
};

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  facilitador: 'Facilitador',
  participante: 'Participante',
};

export const TASK_STATUS_LABELS: Record<ApiCrmTaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export const TASK_STATUS_COLORS: Record<ApiCrmTaskStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-slate-100 text-slate-500',
};

export const PRIORITY_LABELS: Record<ApiCrmTaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export const STEP_TYPE_LABELS: Record<string, string> = {
  survey: 'Encuesta',
  event_attendance: 'Asistencia',
  content_view: 'Contenido',
  milestone: 'Hito',
  social_interaction: 'Social',
  resource_consumption: 'Recurso',
};

export const NONE = '__none__';

export function getInitials(user: ApiUser) {
  if (user.full_name) {
    return user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return user.email[0].toUpperCase();
}

export function resolveLabel(
  value: string | null | undefined,
  options: ApiFieldOption[] | undefined,
): string | null {
  if (!value) return null;
  const match = (options || []).find((o) => o.value === value);
  return match ? match.label : value;
}
