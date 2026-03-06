'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

import { eventService } from '@/services/event.service';
import { journeyService } from '@/services/journey.service';
import { useAuthStore } from '@/store/useAuthStore';
import { ApiLandingConfig, ApiPublicEvent } from '@/types/api.types';
import { EVENT_STATUS_CONFIG } from '@/lib/constants/crm-data';
import { SESSION_KEYS } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Calendar, ArrowRight, Sparkles, Check, Link2, PlayCircle } from 'lucide-react';

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
  const searchParams = useSearchParams();
  
  const { user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false); // Estado para saber si ya leímos la memoria

  const orgSlug = params.orgSlug as string;
  const eventSlug = params.eventSlug as string;

  const [event, setEvent] = useState<ApiPublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  const autoJoinedRef = useRef(false);
  const currentPath = `/events/${orgSlug}/${eventSlug}`;
  const fallbackJoinPath = `${currentPath}?action=join`;

  // 0. Esperar a que Zustand hidrate (lea el localStorage) para evitar bucles
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  // 1. Carga de Datos Paralela
  useEffect(() => {
    if (!hydrated) return; // ¡CLAVE! No hacemos nada hasta que la memoria esté lista

    let isMounted = true;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const eventData = await eventService.getPublicEvent(orgSlug, eventSlug);
        if (!isMounted) return;
        setEvent(eventData);

        if (user) {
          const [enrollmentsData, onboardingCheck] = await Promise.all([
            journeyService.getMyEnrollments().catch(() => []),
            journeyService.checkOnboarding().catch(() => ({ should_show: false }))
          ]);
          
          if (!isMounted) return;
          setEnrollments(enrollmentsData);
          setNeedsOnboarding(onboardingCheck.should_show);
          setUserDataLoaded(true);
        } else {
          setUserDataLoaded(true);
        }
      } catch {
        if (isMounted) setError('Evento no encontrado o no disponible.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllData();
    return () => { isMounted = false; };
  }, [orgSlug, eventSlug, user, hydrated]);

  // 2. Generar código QR
  useEffect(() => {
    setQrUrl(`${window.location.origin}${fallbackJoinPath}`);
  }, [fallbackJoinPath]);

  // 3. Evaluar Auto-Join
  useEffect(() => {
    if (!hydrated || loading || !event || !userDataLoaded || autoJoinedRef.current) return;

    const action = searchParams.get('action');
    if (action !== 'join') return;

    const targetJourneyId = searchParams.get('journeyId');

    // CASO A: Invitado
    if (!user) {
      autoJoinedRef.current = true;
      const joinPath = targetJourneyId 
        ? `${currentPath}?action=join&journeyId=${targetJourneyId}`
        : fallbackJoinPath;
      
      sessionStorage.setItem(SESSION_KEYS.QR_RETURN_URL, joinPath);
      router.push(`/login?returnUrl=${encodeURIComponent(joinPath)}`);
      return;
    }

    // CASO B: Logueado
    if (targetJourneyId) {
      autoJoinedRef.current = true;
      handleJoin(targetJourneyId);
    } else if (event.journey_ids.length === 1) {
      autoJoinedRef.current = true;
      handleJoin(event.journey_ids[0]);
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, loading, event, userDataLoaded, searchParams, user]); 

  // 4. Lógica de Inscripción
  const handleJoin = async (journeyId: string) => {
    const specificJoinPath = `${currentPath}?action=join&journeyId=${journeyId}`;

    if (!user) {
      sessionStorage.setItem(SESSION_KEYS.QR_RETURN_URL, specificJoinPath);
      router.push(`/login?returnUrl=${encodeURIComponent(specificJoinPath)}`);
      return;
    }

    if (needsOnboarding) {
      sessionStorage.setItem(SESSION_KEYS.QR_RETURN_URL, specificJoinPath);
      router.push('/dashboard');
      return;
    }

    const existingEnrollment = enrollments.find(e => e.journey_id === journeyId);
    if (existingEnrollment) {
      sessionStorage.removeItem(SESSION_KEYS.QR_RETURN_URL);
      router.push(`/journey/${existingEnrollment.id}`);
      return;
    }

    setJoiningId(journeyId);
    setJoinMessage(null);
    let isRedirecting = false;

    try {
      const enrollment = await journeyService.enrollInJourneyWithEvent(journeyId, event!.id);
      sessionStorage.removeItem(SESSION_KEYS.QR_RETURN_URL);
      isRedirecting = true;
      router.push(`/journey/${enrollment.id}`);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      
      if (e?.status === 409 || (e?.message && e.message.includes('activa'))) {
        try { await journeyService.updateEnrollmentEvent(journeyId, event!.id); } catch { }
        
        sessionStorage.removeItem(SESSION_KEYS.QR_RETURN_URL);
        setJoinMessage('Ya estás inscrito. Abriendo tu progreso...');
        isRedirecting = true;
        
        try {
          const freshEnrollments = await journeyService.getMyEnrollments();
          const current = freshEnrollments.find((en) => en.journey_id === journeyId);
          setTimeout(() => {
            current ? router.push(`/journey/${current.id}`) : router.push('/journey');
          }, 800);
        } catch {
          router.push('/journey');
        }
      } else {
        setJoinMessage(e?.message || 'Error al inscribirse. Intenta de nuevo.');
      }
    } finally {
      if (!isRedirecting) {
        setJoiningId(null);
      }
    }
  };

  const isAutoJoinIntent = searchParams.get('action') === 'join';
  const isMultiJourney = event ? event.journey_ids.length > 1 : false;
  const needsToChoose = user && isMultiJourney && !searchParams.get('journeyId');

  // PANTALLA DE CARGA INMERSIVA (Muestra el loader mientras hidrata también)
  if (!hydrated || loading || (isAutoJoinIntent && !needsToChoose && !error && !joinMessage)) {
    const bgColor = event?.landing_config?.background_color || '#0F172A';
    const primaryColor = event?.landing_config?.primary_color || '#3B82F6';
    const textColor = event?.landing_config?.text_color || '#FFFFFF';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center transition-colors duration-500" style={{ backgroundColor: bgColor }}>
        <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: primaryColor }} />
        <p className="text-sm font-medium animate-pulse" style={{ color: textColor, opacity: 0.7 }}>
          Preparando tu experiencia...
        </p>
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

  const renderJoinButton = (journeyId: string, classNameStr: string, isSingle: boolean) => {
    const isEnrolled = enrollments.some(e => e.journey_id === journeyId);
    const isLoading = joiningId === journeyId;

    return (
      <motion.button
        className={classNameStr}
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
          boxShadow: isSingle ? `0 8px 40px ${primaryColor}50` : `0 4px 16px ${primaryColor}30`,
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleJoin(journeyId)}
        disabled={isLoading}
      >
        {isLoading ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> {isSingle ? 'Procesando...' : ''}</>
        ) : isEnrolled ? (
          <><PlayCircle className="h-5 w-5" /> Ir al programa <ArrowRight className="h-5 w-5" /></>
        ) : user ? (
          <><Sparkles className="h-5 w-5" /> Unirme <ArrowRight className="h-5 w-5" /></>
        ) : (
          isSingle ? <>Iniciar sesión para unirme <ArrowRight className="h-5 w-5" /></> : 'Iniciar sesión'
        )}
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={buildBackground(config)}>
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-3xl pointer-events-none" style={{ background: primaryColor, opacity: 0.18 }} />
      <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full blur-3xl pointer-events-none" style={{ background: primaryColor, opacity: 0.12 }} />
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full blur-3xl pointer-events-none" style={{ background: `linear-gradient(135deg, ${primaryColor}40, transparent)` }} />

      {config.custom_logo_url && (
        <motion.div className="flex justify-center pt-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.custom_logo_url} alt="Logo" className="h-12 object-contain" />
        </motion.div>
      )}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">
          <motion.div className="text-center mb-8 space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <div className="flex justify-center mb-3">
              <Badge variant="outline" className={`${STATUS_DARK_COLORS[event.status] ?? ''} border text-xs`}>
                {EVENT_STATUS_CONFIG[event.status]?.label ?? event.status}
              </Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight" style={{ color: textColor, textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
              {config.title || event.name}
            </h1>
            {config.welcome_message && <p className="text-base sm:text-lg leading-relaxed" style={{ color: textColor, opacity: 0.8 }}>{config.welcome_message}</p>}
            {event.description && !config.welcome_message && <p className="text-sm leading-relaxed" style={{ color: textColor, opacity: 0.7 }}>{event.description}</p>}
          </motion.div>

          <motion.div className="flex justify-center mb-4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <div className="relative">
              <div className="absolute -inset-8 rounded-[2.5rem] blur-3xl pointer-events-none" style={{ background: primaryColor, opacity: 0.28 }} />
              <div className="relative bg-white p-6 rounded-3xl shadow-2xl">
                {qrUrl ? <QRCode value={qrUrl} size={260} fgColor={primaryColor} bgColor="#FFFFFF" /> : <div className="w-[260px] h-[260px] bg-slate-100 rounded-2xl animate-pulse" />}
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col items-center gap-2 mb-6">
            <p className="text-center text-xs" style={{ color: textColor, opacity: 0.45 }}>Escanea para unirte al evento</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(qrUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
              style={{ color: textColor }}
            >
              {copied ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </button>
          </div>

          {(event.start_date || event.location) && (
            <motion.div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs mb-8" style={{ color: textColor, opacity: 0.6 }} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.3 }}>
              {event.start_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: primaryColor }} />
                  {new Date(event.start_date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: primaryColor }} />
                  {event.location}
                </span>
              )}
            </motion.div>
          )}

          <AnimatePresence>
            {joinMessage && (
              <motion.p className="text-center text-sm mb-4 font-medium" style={{ color: primaryColor }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {joinMessage}
              </motion.p>
            )}
          </AnimatePresence>

          {hasJourneys && (multiJourney ? (
            <motion.div className="space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
              <p className="text-center text-sm font-semibold" style={{ color: textColor, opacity: 0.8 }}>Elige tu programa:</p>
              <div className="space-y-3">
                {event.journey_summaries.map((journey, index) => (
                  <motion.div key={journey.id} className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-5 hover:bg-white/15 transition-colors duration-200 shadow-lg" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: primaryColor }} />
                    <div className="flex items-center justify-between gap-4 pl-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base leading-snug" style={{ color: textColor }}>{journey.title}</p>
                      </div>
                      {renderJoinButton(journey.id, "shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all duration-200 cursor-pointer", false)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div className="space-y-3 relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
              <div className="absolute -inset-2 rounded-3xl blur-xl opacity-30 pointer-events-none" style={{ background: primaryColor }} />
              {renderJoinButton(event.journey_ids[0], "relative w-full py-5 px-6 rounded-2xl text-lg font-bold text-white shadow-xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer", true)}
              <p className="text-center text-xs" style={{ color: textColor, opacity: 0.4 }}>Gratis y sin compromiso</p>
            </motion.div>
          ))}

          <motion.p className="mt-12 text-center text-xs tracking-wider uppercase" style={{ color: textColor, opacity: 0.2 }} initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ delay: 1 }}>
            Powered by Oasis
          </motion.p>
        </div>
      </div>
    </div>
  );
}