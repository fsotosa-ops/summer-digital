import { UserRank } from '@/types';

export function calculateRank(score: number): UserRank {
  if (score >= 81) return "Oasis";
  if (score >= 61) return "Bosque";
  if (score >= 41) return "Árbol";
  if (score >= 21) return "Brote";
  return "Semilla";
}
