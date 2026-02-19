'use client';

import { useState } from 'react';
import { User } from '@/types';
import { AlertTriangle } from 'lucide-react';
import { CompleteProfileModal } from './CompleteProfileModal';

interface UserProfileCardProps {
  user: User;
}

const ROLE_LABELS: Record<string, string> = {
  Subscriber: 'Suscriptor',
  Participant: 'Participante',
  Admin: 'Administrador',
  SuperAdmin: 'Super Admin',
};

export function UserProfileCard({ user }: UserProfileCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const isIncomplete = user.oasisScore === 0;
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <>
      <div className="bg-gradient-to-br from-sky-500 via-purple-500 to-amber-400 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        {/* Noise overlay */}
        <div
          className="absolute inset-0 opacity-20 mix-blend-soft-light pointer-events-none"
          style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
        />

        {/* SVG decoration */}
        <svg
          className="absolute -bottom-8 -right-8 w-40 h-40 text-white/10 pointer-events-none"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <circle cx="50" cy="50" r="50" />
        </svg>

        {/* Centered content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-20 w-20 rounded-full object-cover border-4 border-black/20 ring-2 ring-white/20 drop-shadow"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-white/20 border-4 border-black/20 ring-2 ring-white/20 flex items-center justify-center drop-shadow">
              <span className="text-2xl font-bold text-white drop-shadow">{initials}</span>
            </div>
          )}

          {/* Info */}
          <div>
            <p className="font-bold text-lg leading-tight drop-shadow">{user.name}</p>
            <p className="text-white/80 text-sm mt-0.5">{user.email}</p>
            <span className="mt-2 inline-block px-3 py-0.5 bg-white/20 rounded-full text-xs font-medium">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* Alerta perfil incompleto — clickable */}
        {isIncomplete && (
          <button
            onClick={() => setModalOpen(true)}
            className="relative z-10 mt-4 w-full flex items-start gap-2 bg-amber-400/30 border border-amber-300/40 rounded-xl px-3 py-2.5 text-sm text-left hover:bg-amber-400/40 transition-colors cursor-pointer"
          >
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-100" />
            <span className="text-amber-50 leading-snug">
              Completa tu perfil para empezar a acumular puntos.{' '}
              <span className="underline underline-offset-2 font-medium">Completar ahora →</span>
            </span>
          </button>
        )}
      </div>

      <CompleteProfileModal
        user={user}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
