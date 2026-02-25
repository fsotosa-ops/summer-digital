'use client';

import { User } from '@/types';

interface HeroBannerProps {
  user: User;
}

const ROLE_SUBTITLES: Record<string, string> = {
  Participant: 'Tu espacio de transformación te espera.',
  Admin: 'Gestiona tu organización y guía el crecimiento.',
  SuperAdmin: 'Vista global de la plataforma.',
  Subscriber: 'Explora los recursos disponibles para ti.',
};

export function HeroBanner({ user }: HeroBannerProps) {
  const firstName = user.name.split(' ')[0];
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  const subtitle = ROLE_SUBTITLES[user.role] ?? 'Bienvenido de nuevo.';

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-sky-400 via-purple-400 to-amber-300 p-6 md:p-8 text-white shadow-xl">
      {/* Decorative blobs */}
      <svg
        className="absolute -top-12 -right-12 w-64 h-64 text-white/10 pointer-events-none"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <circle cx="50" cy="50" r="50" />
      </svg>
      <svg
        className="absolute -bottom-16 -left-8 w-48 h-48 text-white/5 pointer-events-none"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <circle cx="50" cy="50" r="50" />
      </svg>

      {/* Content */}
      <div className="relative z-10 flex items-center gap-5">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Greeting */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight drop-shadow">
            ¡Hola, {firstName}!
          </h1>
          <p className="text-white/80 text-sm mt-1">{subtitle}</p>

          {/* Inline score + rank chips */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold">
              ⭐ {user.oasisScore} pts
            </span>
            {user.rank && (
              <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold">
                🏆 {user.rank}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
