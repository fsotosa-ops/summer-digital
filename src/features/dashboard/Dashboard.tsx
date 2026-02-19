'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useContentStore } from '@/store/useContentStore';
import { UserProfileCard } from './components/UserProfileCard';
import { GamificationWidget } from './components/GamificationWidget';
import { NewsWidget } from './components/NewsWidget';
import { JourneyProgressWidget } from './components/JourneyProgressWidget';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export function Dashboard() {
  const { user } = useAuthStore();

  if (!user) return (
    <div className="flex flex-col items-center justify-center p-10 h-full">
      <p className="text-slate-500 mb-4">No hay sesión activa.</p>
      <Link href="/login">
        <Button>Ir al Login</Button>
      </Link>
    </div>
  );

  const firstName = user.name.split(' ')[0];

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-sky-400 via-purple-400 to-amber-300 p-6 md:p-8 text-white shadow-xl">
        {/* SVG circle decoration */}
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

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-yellow-200" />
              <span className="text-white/80 text-sm font-medium">Bienvenida de nuevo</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight drop-shadow">
              Hola, {firstName} 👋
            </h1>
            <p className="text-white/80 mt-1">Tu espacio de transformación te espera.</p>
          </div>
        </div>
      </div>

      {/* 12-column grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          <UserProfileCard user={user} />
          <GamificationWidget score={user.oasisScore} rank={user.rank} />
        </div>

        {/* Right column: 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          <NewsWidget />

          <JourneyProgressWidget />

          {/* Admin Panel */}
          {(user.role === 'SuperAdmin' || user.role === 'Admin') && (
            <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center justify-center text-center">
              <h3 className="text-slate-700 font-semibold mb-2">Panel de Gestión de Contenido</h3>
              <p className="text-sm text-slate-500 mb-4 max-w-md">
                Como administrador, puedes publicar anuncios, crear nuevos viajes y gestionar recursos.
              </p>
              <div className="flex gap-4 flex-wrap justify-center">
                <CreateAnnouncementDialog />
                <Button variant="outline">Crear Nuevo Viaje</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateAnnouncementDialog() {
  const { addAnnouncement } = useContentStore();
  const { user } = useAuthStore();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [type, setType] = React.useState<'info' | 'alert' | 'event'>('info');

  const handleSubmit = () => {
    if (!title || !content) return;
    addAnnouncement({
      title,
      content,
      type,
      authorId: user?.id || 'unknown',
    });
    setOpen(false);
    setTitle('');
    setContent('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Publicar Anuncio</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nuevo Anuncio</DialogTitle>
          <DialogDescription>Este mensaje será visible para todos los usuarios en el Dashboard.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Nueva funcionalidad..." />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v: 'info' | 'alert' | 'event') => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Información</SelectItem>
                <SelectItem value="alert">Alerta</SelectItem>
                <SelectItem value="event">Evento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contenido</Label>
            <Textarea
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              placeholder="Detalles del anuncio..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Publicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
