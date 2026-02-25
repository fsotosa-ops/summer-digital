'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { gamificationService } from '@/services/gamification.service';
import { ApiUserPointsSummary } from '@/types/api.types';
import { Pencil } from 'lucide-react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { ParticipantJourneysSection } from './components/ParticipantJourneysSection';
import { ResourcesFeedWidget } from './components/ResourcesFeedWidget';
import { AdminDashboardPanel } from './components/AdminDashboardPanel';

/* ─── Level progress from real API data ──────────────── */
function getLevelProgress(s: ApiUserPointsSummary) {
  const curMin  = s.current_level?.min_points ?? 0;
  const nextMin = s.next_level?.min_points;
  if (!nextMin) return { pct: 100, needed: 0, next: null };
  const range = nextMin - curMin;
  const pct   = range > 0 ? Math.round(((s.total_points - curMin) / range) * 100) : 100;
  return {
    pct:    Math.max(0, Math.min(100, pct)),
    needed: s.points_to_next_level ?? nextMin - s.total_points,
    next:   s.next_level?.name ?? null,
  };
}

const ROLE_LABELS: Record<string, string> = {
  Participant: 'Participante',
  Admin:       'Administrador',
  SuperAdmin:  'Super Admin',
  Subscriber:  'Suscriptor',
};

/* ─── Dashboard ──────────────────────────────────────── */
export function Dashboard() {
  const { user } = useAuthStore();
  const { journeys } = useJourneyStore();
  const [gamSummary, setGamSummary] = useState<ApiUserPointsSummary | null>(null);

  useEffect(() => {
    gamificationService.getUserSummary()
      .then(setGamSummary)
      .catch(() => setGamSummary(null));
  }, []);

  if (!user) return (
    <div className="flex flex-col items-center justify-center p-10">
      <p className="text-slate-500 mb-4">No hay sesión activa.</p>
      <Link href="/login" className="text-fuchsia-600 font-semibold underline">Ir al Login</Link>
    </div>
  );

  const initials      = user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const isParticipant = user.role === 'Participant';
  const isAdmin       = user.role === 'Admin' || user.role === 'SuperAdmin';
  const isSubscriber  = user.role === 'Subscriber';

  const displayPts    = gamSummary?.total_points   ?? user.oasisScore;
  const levelName     = gamSummary?.current_level?.name ?? user.rank ?? '—';
  const levelProgress = gamSummary ? getLevelProgress(gamSummary) : null;

  const activeJourneys = journeys.filter(j => j.status !== 'completed');

  return (
    <div className="flex flex-col gap-6">

      {/* ══════════════════════════════════════════════════
          PROFILE HERO CARD — full-width, prominent
      ══════════════════════════════════════════════════ */}
      <Link href="/profile">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden
                        cursor-pointer hover:shadow-lg hover:border-fuchsia-200 transition-all group">
          <div className="flex flex-col sm:flex-row">

            {/* Left gradient panel — avatar + score */}
            <div className="bg-gradient-to-br from-fuchsia-500 to-purple-700
                            sm:w-52 p-6 flex flex-col items-center justify-center gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30
                              flex items-center justify-center text-white font-bold text-3xl
                              overflow-hidden">
                {user.avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  : initials}
              </div>
              {/* Score */}
              <div className="text-center">
                <span className="text-4xl font-bold text-white tabular-nums block leading-none">
                  {displayPts}
                </span>
                <span className="text-white/60 text-xs mt-1 block">Oasis Score</span>
              </div>
            </div>

            {/* Right info panel */}
            <div className="p-6 flex flex-col justify-between flex-1 gap-4 min-w-0">
              {/* Name + role + level badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-slate-800 leading-tight truncate">
                    {user.name}
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">{ROLE_LABELS[user.role]}</p>
                </div>
                <span className="px-3 py-1 bg-fuchsia-50 text-fuchsia-700 text-xs font-semibold
                                 rounded-full whitespace-nowrap shrink-0 border border-fuchsia-100">
                  {levelName}
                </span>
              </div>

              {/* Progress bar */}
              <div>
                {levelProgress ? (
                  <>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span>Progreso al siguiente nivel</span>
                      <span className="font-medium tabular-nums">{levelProgress.pct}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-600
                                   rounded-full transition-all duration-700"
                        style={{ width: `${levelProgress.pct}%` }}
                      />
                    </div>
                    {levelProgress.next ? (
                      <p className="text-xs text-slate-400 mt-1.5">
                        <span className="tabular-nums">{levelProgress.needed}</span> pts para{' '}
                        <strong className="text-slate-600">{levelProgress.next}</strong>
                      </p>
                    ) : (
                      <p className="text-xs text-fuchsia-600 font-semibold mt-1.5">
                        Nivel máximo alcanzado
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-1/4 bg-slate-200 animate-pulse rounded-full" />
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5">Cargando progreso...</p>
                  </>
                )}
              </div>

              {/* Hint */}
              <p className="text-[11px] text-slate-300 group-hover:text-fuchsia-400 transition-colors
                            flex items-center gap-1">
                <Pencil size={10} /> Ver y editar perfil
              </p>
            </div>

          </div>
        </div>
      </Link>

      {/* ══════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-sky-400 via-purple-400 to-amber-300
                      rounded-2xl p-6 text-white shadow-sm">
        {isParticipant && (
          <>
            <h2 className="font-bold text-lg">
              {activeJourneys.length > 0
                ? 'Continúa tu journey de transformación'
                : '¡Explora nuevas experiencias de aprendizaje!'}
            </h2>
            <p className="text-white/80 text-sm mt-1">
              {activeJourneys.length > 0
                ? `Tienes ${activeJourneys.length} journey(s) en progreso.`
                : 'Comienza tu camino hacia el siguiente nivel.'}
            </p>
            <Link href="/journey">
              <button className="mt-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white
                                 text-sm font-semibold px-4 py-2 rounded-xl border border-white/30
                                 transition-colors">
                Ver mis journeys
              </button>
            </Link>
          </>
        )}
        {isAdmin && (
          <>
            <h2 className="font-bold text-lg">Panel de Administración</h2>
            <p className="text-white/80 text-sm mt-1">
              Gestiona journeys, recursos, usuarios y gamificación desde aquí.
            </p>
          </>
        )}
        {isSubscriber && (
          <>
            <h2 className="font-bold text-lg">Explora el contenido disponible</h2>
            <p className="text-white/80 text-sm mt-1">Accede a recursos y actividades abiertas.</p>
            <Link href="/resources">
              <button className="mt-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white
                                 text-sm font-semibold px-4 py-2 rounded-xl border border-white/30
                                 transition-colors">
                Ver recursos
              </button>
            </Link>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          ROLE-SPECIFIC CONTENT
      ══════════════════════════════════════════════════ */}
      {isParticipant && (
        <>
          <ParticipantJourneysSection />
          <ResourcesFeedWidget />
        </>
      )}

      {isAdmin && <AdminDashboardPanel user={user} />}

      {isSubscriber && <ResourcesFeedWidget />}

    </div>
  );
}
