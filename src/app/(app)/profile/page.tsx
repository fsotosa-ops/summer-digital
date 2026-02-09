'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { User, Shield, Mail, Building2, Award, Calendar } from "lucide-react";

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
  Bosque: 'bg-brand/10 text-brand',
  Oasis: 'bg-cyan-100 text-cyan-700',
};

export default function ProfilePage() {
  const { user } = useAuthStore();

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
                <AvatarFallback className="bg-brand/10 text-brand text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold text-slate-900">{user.name}</p>
                <Badge className={RANK_COLORS[user.rank] || 'bg-slate-100 text-slate-700'}>
                  {user.rank}
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
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-slate-500">Oasis Score</p>
                <p className="text-2xl font-bold text-brand">{user.oasisScore}</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div
                  className="bg-brand h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(user.oasisScore / 1000) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {1000 - user.oasisScore} puntos para el siguiente nivel
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-3">Medallas ({user.medals.length})</p>
              {user.medals.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.medals.map((medal) => (
                    <div
                      key={medal.id}
                      className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                      title={medal.description}
                    >
                      <Award className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700">{medal.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">
                  Aun no tienes medallas. Completa actividades para ganarlas.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
