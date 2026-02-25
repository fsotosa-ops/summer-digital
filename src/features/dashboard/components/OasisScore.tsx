'use client';

import { motion, animate } from 'framer-motion';
import { useEffect, useState } from 'react';
import { UserRank } from '@/types';

interface OasisScoreProps {
  score: number; // 0-100
  rank?: UserRank;
  variant?: 'default' | 'banner';
}

export function OasisScore({ score, rank, variant = 'default' }: OasisScoreProps) {
  // ⚠️  ALL hooks at the top level — never inside conditionals (Rules of Hooks)
  const [displayScore, setDisplayScore] = useState(0);
  const [scale, setScale] = useState(1);

  // Banner: animated count-up
  useEffect(() => {
    if (variant !== 'banner') return;
    const controls = animate(0, score, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayScore(Math.round(v)),
    });
    return controls.stop;
  }, [score, variant]);

  // Default: pulse on score change
  useEffect(() => {
    if (variant !== 'default') return;
    const t1 = setTimeout(() => setScale(1.1), 0);
    const t2 = setTimeout(() => setScale(1), 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [score, variant]);

  /* ─── Banner variant ─────────────────────────────────────── */
  if (variant === 'banner') {
    const r = 52;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;

    return (
      <div className="relative flex items-center justify-center">
        {/* viewBox keeps the circle centred in the 128×128 space */}
        <svg className="transform -rotate-90 w-32 h-32" viewBox="0 0 128 128">
          {/* Track */}
          <circle
            cx="64" cy="64" r={r}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="10"
            fill="none"
          />
          {/* Progress — yellow-200 (#fde68a) is visible on any background */}
          <motion.circle
            cx="64" cy="64" r={r}
            stroke="#fde68a"
            strokeWidth="10"
            fill="none"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-3xl font-bold text-white leading-none tabular-nums">
            {displayScore}
          </span>
          <span className="text-[11px] text-white/60">/100</span>
        </div>
      </div>
    );
  }

  /* ─── Default variant ────────────────────────────────────── */
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full -z-0 opacity-50" />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wider mb-4">
          Oasis Score
        </h3>

        <div className="relative flex items-center justify-center">
          <svg className="transform -rotate-90 w-40 h-40">
            <circle
              cx="80" cy="80" r={radius}
              stroke="currentColor" strokeWidth="12" fill="transparent"
              className="text-slate-100"
            />
            <motion.circle
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              cx="80" cy="80" r={radius}
              stroke="currentColor" strokeWidth="12" fill="transparent"
              strokeDasharray={circumference}
              strokeLinecap="round"
              className="text-teal-500"
            />
          </svg>
          <motion.div
            animate={{ scale }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute inset-0 flex items-center justify-center flex-col"
          >
            <span className="text-4xl font-bold text-slate-800">{score}</span>
            <span className="text-xs text-slate-400">/100</span>
          </motion.div>
        </div>

        {rank && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={rank}
            className="mt-2 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold uppercase tracking-wide"
          >
            Rango: {rank}
          </motion.div>
        )}

        <p className="mt-4 text-center text-slate-600 text-sm max-w-[200px]">
          Tu impacto como agente de cambio está creciendo.
        </p>
      </div>
    </div>
  );
}
