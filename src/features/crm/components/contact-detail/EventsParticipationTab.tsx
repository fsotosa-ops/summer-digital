'use client';

import { useState, useEffect } from 'react';
import { crmService } from '@/services/crm.service';
import { ApiContactEventParticipation, ApiEventStatus } from '@/types/api.types';
import { EVENT_STATUS_CONFIG } from '@/lib/constants/crm-data';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Loader2, ExternalLink } from 'lucide-react';

const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  dropped: 'Abandonado',
};

interface Props {
  userId: string;
}

export function EventsParticipationTab({ userId }: Props) {
  const [events, setEvents] = useState<ApiContactEventParticipation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    crmService.getContactEvents(userId)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        <Calendar className="h-10 w-10 mx-auto text-slate-300 mb-3" />
        Este contacto aún no ha participado en ningún evento
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/60">
            <TableHead>Evento</TableHead>
            <TableHead>Organización</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Estado evento</TableHead>
            <TableHead>Estado inscripción</TableHead>
            <TableHead className="text-right">Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e) => {
            const statusCfg = EVENT_STATUS_CONFIG[e.event_status as ApiEventStatus];
            const qrUrl = e.org_slug && e.event_slug ? `/events/${e.org_slug}/${e.event_slug}` : null;
            return (
              <TableRow key={e.enrollment_id}>
                <TableCell className="font-medium">{e.event_name}</TableCell>
                <TableCell className="text-slate-600 text-sm">{e.org_name}</TableCell>
                <TableCell className="text-slate-500 text-sm">
                  {e.event_start_date
                    ? new Date(e.event_start_date).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </TableCell>
                <TableCell>
                  {statusCfg ? (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.badgeColor}`}>
                      {statusCfg.label}
                    </span>
                  ) : (
                    <Badge variant="outline">{e.event_status}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {ENROLLMENT_STATUS_LABELS[e.enrollment_status] || e.enrollment_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {qrUrl && (
                    <a
                      href={qrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fuchsia-500 hover:text-fuchsia-700 inline-flex"
                      title="Abrir landing QR"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}