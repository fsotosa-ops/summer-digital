'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resourceService } from '@/services/resource.service';
import { ApiResourceParticipantRead, ApiResourceType } from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Video,
  FileText,
  Headphones,
  Lightbulb,
  Zap,
  Lock,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const TYPE_CONFIG: Record<ApiResourceType, { label: string; icon: React.ElementType; color: string }> = {
  video: { label: 'Video', icon: Video, color: 'text-blue-600 bg-blue-50' },
  podcast: { label: 'Podcast', icon: Headphones, color: 'text-purple-600 bg-purple-50' },
  pdf: { label: 'PDF', icon: FileText, color: 'text-red-600 bg-red-50' },
  capsula: { label: 'Capsula', icon: Lightbulb, color: 'text-amber-600 bg-amber-50' },
  actividad: { label: 'Actividad', icon: Zap, color: 'text-green-600 bg-green-50' },
};

const ALL_TYPES: ApiResourceType[] = ['video', 'podcast', 'pdf', 'capsula', 'actividad'];

export default function ResourcesPage() {
  const router = useRouter();
  const [resources, setResources] = useState<ApiResourceParticipantRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ApiResourceType | 'all'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await resourceService.getMyResources();
        setResources(data);
      } catch (err) {
        console.error('Error loading resources:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filtered = typeFilter === 'all'
    ? resources
    : resources.filter(r => r.type === typeFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Recursos</h1>
          <p className="text-slate-500">Material de apoyo y contenido para tu desarrollo.</p>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
        <button
          onClick={() => setTypeFilter('all')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            typeFilter === 'all'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Todos
        </button>
        {ALL_TYPES.map((t) => {
          const cfg = TYPE_CONFIG[t];
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
                typeFilter === t
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="font-medium">No hay recursos disponibles</p>
          <p className="text-sm mt-1">Los recursos apareceran aqui cuando esten publicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((resource) => {
            const cfg = TYPE_CONFIG[resource.type] || TYPE_CONFIG.video;
            const TypeIcon = cfg.icon;
            const isLocked = !resource.is_unlocked;
            const isConsumed = resource.is_consumed;

            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow',
                  isLocked && 'opacity-75'
                )}
              >
                {/* Thumbnail / Type Icon Area */}
                <div className={cn(
                  'h-32 border-b border-slate-100 flex items-center justify-center relative',
                  isLocked ? 'bg-slate-100' : 'bg-slate-50'
                )}>
                  {resource.thumbnail_url ? (
                    <img
                      src={resource.thumbnail_url}
                      alt={resource.title}
                      className={cn(
                        'w-full h-full object-cover',
                        isLocked && 'grayscale'
                      )}
                    />
                  ) : (
                    <TypeIcon className={cn(
                      'w-12 h-12',
                      isLocked ? 'text-slate-300' : 'text-slate-300'
                    )} />
                  )}
                  {isLocked && (
                    <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center">
                      <Lock className="h-8 w-8 text-slate-600" />
                    </div>
                  )}
                  {isConsumed && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-600 text-white text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Completado
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-1 rounded uppercase tracking-wide',
                      cfg.color
                    )}>
                      {cfg.label}
                    </span>
                    {resource.points_on_completion > 0 && !isConsumed && (
                      <Badge variant="secondary" className="text-xs">
                        +{resource.points_on_completion} pts
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-800 mb-2">{resource.title}</h3>

                  {resource.description && (
                    <p className="text-sm text-slate-500 mb-4 flex-1 line-clamp-2">
                      {resource.description}
                    </p>
                  )}

                  {/* Lock reasons */}
                  {isLocked && resource.lock_reasons.length > 0 && (
                    <div className="mb-4 space-y-1">
                      {resource.lock_reasons.map((reason, i) => (
                        <p key={i} className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded flex items-center gap-1">
                          <Lock className="h-3 w-3 flex-shrink-0" />
                          {reason}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto">
                    {isLocked ? (
                      <Button variant="outline" className="w-full" disabled>
                        <Lock className="h-4 w-4 mr-2" />
                        Bloqueado
                      </Button>
                    ) : isConsumed ? (
                      <Button
                        variant="outline"
                        className="w-full border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                        onClick={() => router.push(`/resources/${resource.id}`)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Ver de nuevo
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                        onClick={() => router.push(`/resources/${resource.id}`)}
                      >
                        Acceder
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
