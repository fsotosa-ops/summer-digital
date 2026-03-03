'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { eventService } from '@/services/event.service';
import { journeyService } from '@/services/journey.service';
import { useAuthStore } from '@/store/useAuthStore';
import { ApiLandingConfig, ApiPublicEvent } from '@/types/api.types';
import { EVENT_STATUS_CONFIG } from '@/lib/constants/crm-data';
import { SESSION_KEYS } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Calendar, Users, ArrowRight, Sparkles } from 'lucide-react';
import React from 'react';

// Dark-mode variants for the public QR landing page
const STATUS_DARK_COLORS: Record<string, string> = {
  upcoming: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  live:     'bg-green-500/20 text-green-300 border-green-500/30',
  past:     'bg-slate-500/20 text-slate-300 border-slate-500/30',
  cancelled:'bg-red-500/20 text-red-300 border-red-500/30',
};

function buildBackground(config: ApiLandingConfig): React.CSSProperties {
  if (config.background_image_url) {
    return {
      backgroundImage: `url(${config.background_image_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (config.background_end_color) {
    const dirMap: Record<string, string> = {
      'to-b':  'to bottom',
      'to-br': 'to bottom right',
      'to-r':  'to right',
      'to-bl': 'to bottom left',
    };
    const cssDir = dirMap[config.gradient_direction || 'to-b'] ?? 'to bottom';
    return { background: `linear-gradient(${cssDir}, ${config.background_color}, ${config.background_end_color})` };
  }
  return { backgroundColor: config.background_color };
}

export default function QRLandingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const orgSlug = params.orgSlug as string;
  const eventSlug = params.eventSlug as string;

  const [event, setEvent] = useState<ApiPublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const data = await eventService.getPublicEvent(orgSlug, eventSlug);
        setEvent(data);
      } catch {
        setError('Evento no encontrado o no disponible.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [orgSlug, eventSlug]);

  const currentPath = `/j/${orgSlug}/${eventSlug}`;

  const handleJoin = async (journeyId: string) => {
    if (!user) {
      sessionStorage.setItem(SESSION_KEYS.QR_RETURN_URL, currentPath);
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    setJoiningId(journeyId);
    setJoinMessage(null);
    try {
      const onboardingCheck = await journeyService.checkOnboarding();
      if (onboardingCheck.should_show) {
        sessionStorage.setItem(SESSION_KEYS.QR_RETURN_URL, currentPath);
        router.push('/dashboard');
        return;
      }

      const enrollment = await journeyService.enrollInJourneyWithEvent(
        journeyId,
        event!.id,
      );
      router.push(`/journey/${enrollment.id}`);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 409 || (e?.message && e.message.includes('activa'))) {
        try {
          await journeyService.updateEnrollmentEvent(journeyId, event!.id);
        } catch {
          // Best-effort
        }
        setJoinMessage('Ya estás inscrito en este journey. Redirigiendo a tu progreso...');
        try {
          const enrollments = await journeyService.getMyEnrollments();
          const existing = enrollments.find((en) => en.journey_id === journeyId);
          if (existing) {
            setTimeout(() => router.push(`/journey/${existing.id}`), 1500);
          } else {
            router.push('/journey');
          }
        } catch {
          router.push('/journey');
        }
      } else {
        setJoinMessage(e?.message || 'Error al inscribirse. Intenta de nuevo.');
      }
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center px-4">
        <div className="space-y-4">
          <p className="text-slate-400 text-lg">{error || 'Evento no disponible.'}</p>
          <button
            className="px-6 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
            onClick={() => router.push('/')}
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  const config = event.landing_config;
  const primaryColor = config.primary_color || '#3B82F6';
  const textColor = config.text_color || '#FFFFFF';
  const hasJourneys = event.journey_ids.length > 0;
  const multiJourney = event.journey_ids.length > 1;

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={buildBackground(config)}
    >
      {/* Ambient orbs */}
      <div
        className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-3xl pointer-events-none"
        style={{ background: primaryColor, opacity: 0.08 }}
      />
      <div
        className="absolute bottom-[-15%] left-[-10%] w-[40%] h-[40%] rounded-full blur-3xl pointer-events-none"
        style={{ background: primaryColor, opacity: 0.06 }}
      />

      {/* Logo */}
      {config.custom_logo_url && (
        <motion.div
          className="flex justify-center pt-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.custom_logo_url}
            alt="Logo"
            className="h-12 object-contain"
          />
        </motion.div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">

          {/* Org name + status */}
          <motion.div
            className="text-center mb-6 space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-semibold tracking-wider uppercase" style={{ color: primaryColor }}>
              {event.org_name}
            </p>
            <Badge
              variant="outline"
              className={`${STATUS_DARK_COLORS[event.status] ?? ''} border text-xs`}
            >
              {EVENT_STATUS_CONFIG[event.status]?.label ?? event.status}
            </Badge>
          </motion.div>

          {/* Event hero */}
          <motion.div
            className="text-center mb-8 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1
              className="text-3xl sm:text-4xl font-bold leading-tight"
              style={{ color: textColor }}
            >
              {config.title || event.name}
            </h1>

            {config.welcome_message && (
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: textColor, opacity: 0.8 }}>
                {config.welcome_message}
              </p>
            )}
            {event.description && !config.welcome_message && (
              <p className="text-sm leading-relaxed" style={{ color: textColor, opacity: 0.7 }}>
                {event.description}
              </p>
            )}
          </motion.div>

          {/* Event meta info card */}
          <motion.div
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 mb-8 space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {event.start_date && (
              <div className="flex items-center gap-3 text-sm" style={{ color: textColor, opacity: 0.8 }}>
                <Calendar className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                <span>
                  {new Date(event.start_date).toLocaleDateString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-3 text-sm" style={{ color: textColor, opacity: 0.8 }}>
                <MapPin className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                <span>{event.location}</span>
              </div>
            )}
            {hasJourneys && (
              <div className="flex items-center gap-3 text-sm" style={{ color: textColor, opacity: 0.8 }}>
                <Users className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                <span>
                  {event.journey_ids.length === 1
                    ? 'Un journey te espera'
                    : `${event.journey_ids.length} journeys disponibles`}
                </span>
              </div>
            )}
          </motion.div>

          {/* Feedback message */}
          <AnimatePresence>
            {joinMessage && (
              <motion.p
                className="text-center text-sm mb-4 font-medium"
                style={{ color: primaryColor }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {joinMessage}
              </motion.p>
            )}
          </AnimatePresence>

          {/* CTA section */}
          {!hasJourneys ? (
            <motion.p
              className="text-center text-sm"
              style={{ color: textColor, opacity: 0.5 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.3 }}
            >
              Este evento es solo informativo (sin journey asociado).
            </motion.p>
          ) : multiJourney ? (
            /* Multiple journeys — stacked cards */
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <p className="text-center text-sm font-semibold" style={{ color: textColor, opacity: 0.8 }}>
                Elige tu programa:
              </p>

              <div className="space-y-3">
                {event.journey_summaries.map((journey, index) => (
                  <motion.div
                    key={journey.id}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 hover:bg-white/10 transition-colors duration-200"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                  >
                    {/* Accent bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                      style={{ backgroundColor: primaryColor }}
                    />

                    <div className="flex items-center justify-between gap-4 pl-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base leading-snug" style={{ color: textColor }}>
                          {journey.title}
                        </p>
                      </div>

                      <motion.button
                        className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all duration-200 cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                          boxShadow: `0 4px 16px ${primaryColor}30`,
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleJoin(journey.id)}
                        disabled={joiningId === journey.id}
                      >
                        {joiningId === journey.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : user ? (
                          <>
                            Unirme
                            <ArrowRight className="h-4 w-4" />
                          </>
                        ) : (
                          'Iniciar sesión'
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Single journey — hero CTA */
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <motion.button
                className="w-full py-4 px-6 rounded-2xl text-lg font-bold text-white shadow-lg flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                  boxShadow: `0 8px 32px ${primaryColor}40`,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleJoin(event.journey_ids[0])}
                disabled={joiningId === event.journey_ids[0]}
              >
                {joiningId === event.journey_ids[0] ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : user ? (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Unirme al evento
                    <ArrowRight className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    Iniciar sesión para unirme
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </motion.button>

              <p className="text-center text-xs" style={{ color: textColor, opacity: 0.4 }}>
                Gratis y sin compromiso
              </p>
            </motion.div>
          )}

          {/* Mini share QR */}
          {config.show_qr !== false && currentUrl && (
            <motion.div
              className="mt-10 flex flex-col items-center gap-2"
              style={{ opacity: 0.5 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1 }}
            >
              <p className="text-xs" style={{ color: textColor }}>Comparte este evento</p>
              <div className="bg-white p-2 rounded-xl">
                <QRCode
                  value={currentUrl}
                  size={64}
                  fgColor={config.background_color || '#0F172A'}
                  bgColor="#FFFFFF"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
