'use client';

import { OasisScore } from './OasisScore';
import { UserRank } from '@/types';
import { Lock } from 'lucide-react';

interface GamificationWidgetProps {
  score: number;
  rank?: UserRank;
}

const PLACEHOLDER_BADGES = [
  { id: 1, label: 'Primera conexión', hint: 'Inicia sesión por primera vez' },
  { id: 2, label: 'Explorador', hint: 'Visita todas las secciones' },
  { id: 3, label: 'Pionero', hint: 'Completa tu primer Journey' },
];

export function GamificationWidget({ score, rank }: GamificationWidgetProps) {
  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      {/* Top decorative border */}
      <div className="h-1 bg-gradient-to-r from-amber-100/50 via-purple-50/10 to-transparent" />

      <div className="p-6">
        <OasisScore score={score} rank={rank} />

        {/* Badges section */}
        <div className="mt-5 border-t border-slate-50 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Medallas</p>
          <div className="flex gap-3">
            {PLACEHOLDER_BADGES.map((badge) => (
              <div
                key={badge.id}
                title={badge.hint}
                className="flex flex-col items-center gap-1.5 cursor-default group"
              >
                <div className="h-12 w-12 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center transition-colors group-hover:bg-slate-50">
                  <Lock size={16} className="text-slate-300" />
                </div>
                <span className="text-[10px] text-slate-400 text-center leading-tight max-w-[52px]">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
