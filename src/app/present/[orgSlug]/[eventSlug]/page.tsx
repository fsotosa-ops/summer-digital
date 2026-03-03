'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { eventService } from '@/services/event.service';
import { ApiPublicEvent } from '@/types/api.types';
import { EVENT_STATUS_CONFIG } from '@/lib/constants/crm-data';
import { Loader2, Calendar, MapPin } from 'lucide-react';
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
        setQrJoinUrl(`${window.location.origin}/j/${orgSlug}/${eventSlug}`);
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
  const textColor = config.text_color || '#FFFFFF';
  const showQr = config.show_qr !== false;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-8 select-none relative overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Ambient glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 70% 50%, ${primaryColor}25 0%, transparent 60%),
                       radial-gradient(ellipse at 30% 50%, ${primaryColor}15 0%, transparent 50%)`,
        }}
      />

      {/* Logo */}
      {config.custom_logo_url && (
        <motion.div
          className="absolute top-8 left-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.custom_logo_url}
            alt="Logo"
            className="h-10 object-contain"
          />
        </motion.div>
      )}

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: Event info */}
        <motion.div
          className="space-y-8 text-center lg:text-left"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Org name */}
          <p
            className="text-base font-semibold uppercase tracking-widest"
            style={{ color: primaryColor }}
          >
            {event.org_name}
          </p>

          {/* Status badge */}
          <div className="flex items-center justify-center lg:justify-start gap-2">
            {event.status === 'live' && (
              <span className="relative flex h-3 w-3">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: primaryColor }}
                />
                <span
                  className="relative inline-flex rounded-full h-3 w-3"
                  style={{ backgroundColor: primaryColor }}
                />
              </span>
            )}
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
          <h1
            className="text-5xl lg:text-7xl font-extrabold leading-tight"
            style={{ color: textColor }}
          >
            {config.title || event.name}
          </h1>

          {/* Welcome message */}
          {config.welcome_message && (
            <p className="text-2xl leading-relaxed" style={{ color: textColor, opacity: 0.8 }}>
              {config.welcome_message}
            </p>
          )}

          {/* Details */}
          <div className="space-y-3">
            {event.start_date && (
              <div className="flex items-center gap-3 text-lg" style={{ color: textColor, opacity: 0.6 }}>
                <Calendar className="h-5 w-5 shrink-0" style={{ color: primaryColor }} />
                <span>
                  {new Date(event.start_date).toLocaleDateString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-3 text-lg" style={{ color: textColor, opacity: 0.6 }}>
                <MapPin className="h-5 w-5 shrink-0" style={{ color: primaryColor }} />
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Right: QR Code with glow effect */}
        {showQr && qrJoinUrl && (
          <motion.div
            className="flex flex-col items-center gap-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          >
            {/* QR container with glow */}
            <div className="relative">
              {/* Animated glow ring */}
              <motion.div
                className="absolute -inset-4 rounded-[2rem] blur-xl"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)` }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Outer ambient glow */}
              <motion.div
                className="absolute -inset-8 rounded-[2.5rem] blur-2xl"
                style={{ background: primaryColor }}
                animate={{ opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              />

              {/* QR card */}
              <div
                className="relative p-8 rounded-3xl shadow-2xl backdrop-blur-sm"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  border: `2px solid ${primaryColor}40`,
                }}
              >
                <div className="w-64 h-64 lg:w-80 lg:h-80 flex items-center justify-center">
                  <QRCode
                    value={qrJoinUrl}
                    size={380}
                    bgColor="transparent"
                    fgColor={primaryColor}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Instruction text */}
            <motion.div
              className="text-center space-y-2"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="font-bold text-2xl lg:text-3xl tracking-tight" style={{ color: textColor }}>
                Escanea para unirte
              </p>
              <p className="text-sm font-medium" style={{ color: textColor, opacity: 0.4 }}>
                Apunta tu cámara al código QR
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
