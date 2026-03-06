'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { eventService } from '@/services/event.service';
import { ApiPublicEvent } from '@/types/api.types';
import { EVENT_STATUS_CONFIG } from '@/lib/constants/crm-data';
import { Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function PresentPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const eventSlug = params.eventSlug as string;

  const [event, setEvent] = useState<ApiPublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrJoinUrl, setQrJoinUrl] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const data = await eventService.getPublicEvent(orgSlug, eventSlug);
        setEvent(data);
        const eventPath = `/events/${orgSlug}/${eventSlug}?action=join`;
        setQrJoinUrl(`${window.location.origin}/login?returnUrl=${encodeURIComponent(eventPath)}`);
      } catch {
        setError('Evento no encontrado o no disponible.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [orgSlug, eventSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-lg">
        {error || 'Evento no disponible.'}
      </div>
    );
  }

  const config = event.landing_config;
  const bgColor = config.background_color || '#0F172A';
  const primaryColor = config.primary_color || '#3B82F6';
  const showQr = config.show_qr !== false;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-8 select-none"
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: Event info */}
        <div className="space-y-8 text-center lg:text-left">
          {/* Org name */}
          <p
            className="text-base font-semibold uppercase tracking-widest"
            style={{ color: primaryColor }}
          >
            {event.org_name}
          </p>

          {/* Status badge */}
          <div>
            <span
              className="inline-block text-sm font-bold px-4 py-1 rounded-full border"
              style={{
                borderColor: `${primaryColor}60`,
                color: primaryColor,
                backgroundColor: `${primaryColor}20`,
              }}
            >
              {EVENT_STATUS_CONFIG[event.status]?.label ?? event.status}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-tight">
            {config.title || event.name}
          </h1>

          {/* Welcome message */}
          {config.welcome_message && (
            <p className="text-2xl text-slate-300 leading-relaxed">
              {config.welcome_message}
            </p>
          )}

          {/* Details */}
          <div className="space-y-3">
            {event.start_date && (
              <p className="text-slate-400 text-lg">
                📅{' '}
                {new Date(event.start_date).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
            {event.location && (
              <p className="text-slate-400 text-lg">📍 {event.location}</p>
            )}
          </div>
        </div>

        {/* Right: QR Code */}
        {showQr && qrJoinUrl && (
          <div className="flex flex-col items-center gap-6">
            <div
              className="p-6 rounded-3xl shadow-2xl"
              style={{ backgroundColor: `${primaryColor}20`, border: `2px solid ${primaryColor}40` }}
            >
              <div className="w-64 h-64 lg:w-80 lg:h-80 flex items-center justify-center">
                <QRCode
                  value={qrJoinUrl}
                  size={380}
                  bgColor={bgColor}
                  fgColor={primaryColor}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>

            <div className="text-center space-y-1">
              <p className="text-white font-bold text-xl">Escanea para unirte</p>
              <p className="text-slate-500 text-sm break-all">{qrJoinUrl}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}