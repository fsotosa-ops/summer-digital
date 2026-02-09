'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useContentStore } from '@/store/useContentStore';
import { NewsWidget } from './components/NewsWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Map, Star, Zap, BookOpen, Users } from 'lucide-react';
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600 rounded-full blur-[100px] opacity-10 translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4 max-w-3xl">
            <Badge variant="outline" className="text-brand border-brand/50 bg-brand/10 backdrop-blur-md">
              <Zap size={12} className="mr-1 fill-current" /> Edición 2024
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-purple-400">Oasis Digital</span>
            </h1>
            <p className="text-slate-300 text-lg md:text-xl leading-relaxed">
              Nos pone muy contentos que te unas a nuestra comunidad. Obtén tus primeros 5 ptos de tu Oasis Score, completando tus datos y estarás formando parte de la OASIS Community.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <Link href="/profile">
                <Button size="lg" className="bg-brand hover:bg-brand/90 text-white border-0 shadow-lg shadow-brand/20 rounded-full px-8">
                  Completar mis datos <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Mini Stats for Hero */}
          <div className="hidden md:flex gap-6 p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{user.oasisScore}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Puntos</div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-brand">{user.rank}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Rango</div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-200">{user.medals.length}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Medallas</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Journeys & Resources */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Journey Card */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Map className="text-brand" /> Tu Viaje Actual
              </h2>
              <Link href="/journey" className="text-sm text-brand font-medium hover:underline">
                Ver mapa completo
              </Link>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-brand/30 transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-700" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Badge className="bg-brand/10 text-brand border-0 mb-2">En Progreso</Badge>
                    <h3 className="text-2xl font-bold text-slate-800">Transformación Digital I</h3>
                    <p className="text-slate-500 mt-1">Módulo 2: Herramientas Colaborativas</p>
                  </div>
                  <div className="h-12 w-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100">
                    <span className="font-bold text-brand text-sm">45%</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 mb-6">
                  <div className="bg-brand h-3 rounded-full" style={{ width: '45%' }} />
                </div>

                <div className="flex gap-3">
                   <Button className="flex-1 bg-slate-900 text-white hover:bg-slate-800">
                     Reanudar Módulo
                   </Button>
                   <Button variant="outline" className="flex-1">
                     Ver Recursos
                   </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Featured Resources */}
          <section>
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 <BookOpen className="text-brand" /> Destacados para ti
               </h2>
               <Link href="/resources" className="text-sm text-slate-500 hover:text-slate-800">Explorar todo</Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[1, 2].map((i) => (
                 <div key={i} className="flex p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="h-12 w-12 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 mr-4 shrink-0">
                      <Star size={20} fill="currentColor" className="opacity-20" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-1">Guía de Facilitación</h4>
                      <p className="text-sm text-slate-500 line-clamp-2">Aprende a gestionar grupos dinámicos en entornos digitales.</p>
                    </div>
                 </div>
               ))}
            </div>
          </section>

        </div>

        {/* Right Column: Community & News */}
        <div className="space-y-8">
           
           {/* Community Pulse */}
           <section>
             <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="text-brand" /> Comunidad
             </h2>
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-4 mb-6">
                   <div className="flex -space-x-3">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />
                      ))}
                   </div>
                   <div className="text-sm text-slate-500">
                     <strong className="text-slate-900">+12</strong> compañeros activos
                   </div>
                </div>
                
                <div className="space-y-4">
                   <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic border-l-4 border-slate-300">
                     &quot;¡Acabo de terminar el módulo de empatía! Increíble.&quot;
                   </div>
                   <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic border-l-4 border-slate-300">
                     &quot;¿Alguien para practicar el pitch mañana?&quot;
                   </div>
                </div>

                <Button variant="ghost" className="w-full mt-4 text-brand hover:text-brand hover:bg-brand/5">
                  Ir al Foro General
                </Button>
             </div>
           </section>

           {/* News Widget (Existing) */}
           <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Novedades</h2>
              <NewsWidget />
           </section>

        </div>

      </div>

      {/* Admin Quick Actions */}
      {(user.role === 'SuperAdmin' || user.role === 'Admin') && (
        <section className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
             <div>
                 <h3 className="text-slate-700 font-semibold">Panel de Administración</h3>
                 <p className="text-sm text-slate-500">Accesos directos para gestión de contenido.</p>
             </div>
             <div className="flex gap-3">
                 <CreateAnnouncementDialog />
                 <Button variant="outline">Crear Nuevo Viaje</Button>
             </div>
        </section>
      )}

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
            authorId: user?.id || 'unknown'
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
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Nueva funcionalidad..." />
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
                        <Textarea value={content} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)} placeholder="Detalles del anuncio..." />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>Publicar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
