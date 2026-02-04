'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { OasisScore } from './components/OasisScore';
import { NewsWidget } from './components/NewsWidget';
import { Button } from '@/components/ui/button';
import { ArrowRight, Map } from 'lucide-react';
import Link from 'next/link';

export function Dashboard() {
  const { user } = useAuthStore();
  
  // Auto-login removed. Auth handled by MainLayout or Middleware in real app.
  // For dev, if no user, show loading or redirect.
  // We'll let the user manually login via the new Login page if they hit this directly or are redirected.

  if (!user) return (
     <div className="flex flex-col items-center justify-center p-10 h-full">
        <p className="text-slate-500 mb-4">No hay sesión activa.</p>
        <Link href="/login">
            <Button>Ir al Login</Button>
        </Link>
     </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hola, {user.name.split(' ')[0]}</h1>
          <p className="text-slate-500">Bienvenida de nuevo a tu espacio de transformación.</p>
        </div>
        <Link href="/journey">
          <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg">
            Continuar mi Viaje <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Stats & Shortcuts */}
        <div className="space-y-6">
           <OasisScore score={user.oasisScore} />
           
           <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-semibold text-lg mb-1">Próximo Evento</h3>
                <p className="text-indigo-100 text-sm mb-4">Taller de Comunicación</p>
                <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                   Ver Detalles
                </Button>
              </div>
              <Map className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-10" />
           </div>
        </div>

        {/* Right Column: Content/News */}
        <div className="md:col-span-2">
           <NewsWidget />
        </div>
      </div>
    </div>
  );
}
