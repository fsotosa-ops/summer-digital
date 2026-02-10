'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { gamificationService } from "@/services/gamification.service";
import { ApiUserPointsSummary } from "@/types/api.types";
import { User, Shield, Mail, Building2, Award, Calendar, TrendingUp, Star } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Super Administrador',
  Admin: 'Administrador',
  Participant: 'Participante',
  Subscriber: 'Suscriptor',
};

const RANK_COLORS: Record<string, string> = {
  Semilla: 'bg-amber-100 text-amber-700',
  Brote: 'bg-green-100 text-green-700',
  Arbol: 'bg-emerald-100 text-emerald-700',
  Bosque: 'bg-teal-100 text-teal-700',
  Oasis: 'bg-cyan-100 text-cyan-700',
};

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<ApiUserPointsSummary | null>(null);
  const [isLoadingGamification, setIsLoadingGamification] = useState(true);

  useEffect(() => {
    async function fetchGamification() {
      try {
        const data = await gamificationService.getUserSummary();
        setSummary(data);
      } catch (error) {
        console.error('Error fetching gamification summary:', error);
      } finally {
        setIsLoadingGamification(false);
      }
    }

    if (user) {
      fetchGamification();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-500">
        Cargando perfil...
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const totalPoints = summary?.total_points ?? user.oasisScore;
  const currentLevelName = summary?.current_level?.name ?? user.rank;
  const pointsToNext = summary?.points_to_next_level;
  const nextLevelMin = summary?.next_level?.min_points;
  const badges = summary?.rewards ?? [];
  const activities = summary?.recent_activities ?? [];

  // Calculate progress percentage for the bar
  let progressPercent = 0;
  if (summary?.current_level && summary?.next_level) {
    const currentMin = summary.current_level.min_points;
    const nextMin = summary.next_level.min_points;
    const range = nextMin - currentMin;
    progressPercent = range > 0 ? Math.round(((totalPoints - currentMin) / range) * 100) : 100;
  } else if (!summary?.next_level) {
    progressPercent = 100; // Max level reached
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
        <p className="text-slate-500">Gestiona tu informacion personal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-slate-400" />
              Informacion Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="bg-teal-100 text-teal-700 text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold text-slate-900">{user.name}</p>
                <Badge className={RANK_COLORS[currentLevelName] || 'bg-slate-100 text-slate-700'}>
                  {currentLevelName}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Rol</p>
                  <p className="font-medium text-slate-900">{ROLE_LABELS[user.role] || user.role}</p>
                </div>
              </div>

              {user.organizationId && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Organizacion</p>
                    <p className="font-medium text-slate-900 text-xs text-slate-400 font-mono">
                      {user.organizationId}
                    </p>
                  </div>
                </div>
              )}

              {user.lastConnection && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Ultima conexion</p>
                    <p className="font-medium text-slate-900">
                      {new Date(user.lastConnection).toLocaleDateString('es-CL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gamification Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-slate-400" />
              Progreso y Logros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingGamification ? (
              <div className="text-center text-slate-400 py-4">Cargando datos...</div>
            ) : (
              <>
                {/* Points & Level */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-slate-500">Puntos Totales</p>
                    <p className="text-2xl font-bold text-teal-600">{totalPoints}</p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className="bg-teal-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                  {pointsToNext != null && nextLevelMin != null ? (
                    <p className="text-xs text-slate-400 mt-1">
                      {pointsToNext} puntos para {summary?.next_level?.name ?? 'el siguiente nivel'}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Nivel maximo alcanzado</p>
                  )}
                </div>

                {/* Badges/Rewards */}
                <div>
                  <p className="text-sm text-slate-500 mb-3 flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    Insignias ({badges.length})
                  </p>
                  {badges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {badges.map((userReward) => (
                        <div
                          key={userReward.id}
                          className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                          title={userReward.reward?.description ?? ''}
                        >
                          {userReward.reward?.icon_url ? (
                            <img src={userReward.reward.icon_url} alt="" className="h-4 w-4" />
                          ) : (
                            <Award className="h-4 w-4 text-amber-500" />
                          )}
                          <span className="text-sm font-medium text-amber-700">
                            {userReward.reward?.name ?? 'Insignia'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">
                      Aun no tienes insignias. Completa actividades para ganarlas.
                    </p>
                  )}
                </div>

                {/* Recent Activities */}
                {activities.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-3 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Actividad Reciente
                    </p>
                    <div className="space-y-2">
                      {activities.slice(0, 5).map((activity) => (
                        <div
                          key={activity.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-slate-600">
                            {activity.type === 'step_completed' ? 'Paso completado' :
                             activity.type === 'journey_completed' ? 'Journey completado' :
                             activity.type}
                          </span>
                          <span className="text-teal-600 font-medium">
                            +{activity.points_awarded} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
