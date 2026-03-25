'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User } from '@/types';
import { Sparkles, ChevronRight } from 'lucide-react';
import { CompleteProfileModal } from './CompleteProfileModal';
import { motion } from 'framer-motion';

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
  const [imgError, setImgError] = useState(false);

  const isIncomplete = user.oasisScore === 0;
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <>
      <div className="bg-gradient-to-br from-slate-900 via-neutral-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-summer-pink/20 to-summer-lavender/10 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-summer-teal/15 to-cyan-500/10 rounded-full translate-y-6 -translate-x-6 blur-2xl" />

        {/* Centered content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          {user.avatarUrl && !imgError ? (
            <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-white/10 ring-2 ring-summer-sky/30 drop-shadow">
              <Image
                src={user.avatarUrl}
                alt={user.name}
                fill
                className="object-cover"
                sizes="80px"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-summer-pink to-summer-lavender border-2 border-white/10 ring-2 ring-summer-pink/30 flex items-center justify-center drop-shadow">
              <span className="text-2xl font-bold text-white drop-shadow">{initials}</span>
            </div>
          )}

          {/* Info */}
          <div>
            <p className="font-bold text-lg leading-tight">{user.name}</p>
            <p className="text-white/50 text-sm mt-0.5">{user.email}</p>
            <span className="mt-2 inline-block px-3 py-0.5 bg-white/10 rounded-full text-xs font-medium text-white/80">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* Banner de perfil incompleto - rediseñado */}
        {isIncomplete && (
          <motion.button
            onClick={() => setModalOpen(true)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="relative z-10 mt-5 w-full group cursor-pointer"
          >
            <div className="bg-gradient-to-r from-summer-pink/90 to-summer-lavender/90 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 border border-summer-pink/20 shadow-lg shadow-summer-pink/10 transition-all group-hover:shadow-summer-pink/20 group-hover:border-summer-pink/30">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-summer-yellow" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white leading-tight">
                  Completa tu perfil
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  Gana puntos y personaliza tu experiencia
                </p>
              </div>
              <ChevronRight size={16} className="text-white/40 group-hover:text-white/70 transition-colors flex-shrink-0" />
            </div>
          </motion.button>
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