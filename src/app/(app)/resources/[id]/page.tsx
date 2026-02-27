'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { resourceService } from '@/services/resource.service';
import { ApiResourceParticipantRead } from '@/types/api.types';
import { detectAndResolveUrl } from '@/lib/url-detection';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
  Lock,
  Download,
  Video,
  FileText,
  Headphones,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = params.id as string;

  const [resource, setResource] = useState<ApiResourceParticipantRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [xpPop, setXpPop] = useState<{ visible: boolean; amount: number }>({
    visible: false,
    amount: 0,
  });
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const load = async () => {
      try {
        const data = await resourceService.getMyResource(resourceId);
        setResource(data);
        if (data.is_unlocked) {
          await resourceService.openResource(resourceId);
        }
      } catch (err) {
        console.error('Error loading resource:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    startTimeRef.current = Date.now();
  }, [resourceId]);

  const handleComplete = async () => {
    if (!resource || resource.is_consumed) return;
    setIsCompleting(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      await resourceService.completeResource(resourceId, {
        time_on_page_seconds: timeSpent,
      });
      setResource({ ...resource, is_consumed: true });

      // XP pop animation
      if (resource.points_on_completion > 0) {
        setXpPop({ visible: true, amount: resource.points_on_completion });
        setTimeout(() => setXpPop({ visible: false, amount: 0 }), 1600);
        toast.success(`+${resource.points_on_completion} puntos ganados!`);
      } else {
        toast.success('Recurso completado');
      }
    } catch {
      toast.error('Error al completar recurso');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Recurso no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/resources')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  if (!resource.is_unlocked) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
        <Lock className="h-12 w-12 mx-auto text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-900">{resource.title}</h1>
        <p className="text-slate-500">Este recurso esta bloqueado.</p>
        {resource.lock_reasons.length > 0 && (
          <div className="space-y-2">
            {resource.lock_reasons.map((reason, i) => (
              <p
                key={i}
                className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg inline-block"
              >
                <Lock className="h-3 w-3 inline mr-1" />
                {reason}
              </p>
            ))}
          </div>
        )}
        <Button variant="outline" onClick={() => router.push('/resources')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Recursos
        </Button>
      </div>
    );
  }

  // Resolve URL for embedding
  const detected = resource.content_url ? detectAndResolveUrl(resource.content_url) : null;

  const typeIcons: Record<string, React.ElementType> = {
    video: Video,
    podcast: Headphones,
    pdf: FileText,
    capsula: Lightbulb,
    actividad: Zap,
  };
  const TypeIcon = typeIcons[resource.type] || FileText;

  const typeBadgeColors: Record<string, string> = {
    video: 'bg-sky-50 text-sky-700 border-sky-200',
    podcast: 'bg-purple-50 text-purple-700 border-purple-200',
    pdf: 'bg-red-50 text-red-700 border-red-200',
    capsula: 'bg-amber-50 text-amber-700 border-amber-200',
    actividad: 'bg-teal-50 text-teal-700 border-teal-200',
  };
  const badgeColor = typeBadgeColors[resource.type] || 'bg-slate-50 text-slate-700 border-slate-200';

  const hasEmbeddedContent =
    detected &&
    ['youtube', 'vimeo', 'google_slides', 'google_drive_pdf', 'pdf'].includes(detected.type);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── TopBar ─────────────────────────────────────────────── */}
      <div className="bg-white border-b px-4 h-14 flex items-center gap-3 sticky top-14 z-10">
        <button
          onClick={() => router.push('/resources')}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium hidden sm:inline">Recursos</span>
        </button>

        <span className="text-slate-200">|</span>

        {/* Type badge */}
        <span
          className={cn(
            'flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border flex-shrink-0',
            badgeColor
          )}
        >
          <TypeIcon size={11} />
          {resource.type}
        </span>

        {/* Title */}
        <h1 className="flex-1 text-sm font-semibold text-slate-800 truncate min-w-0">
          {resource.title}
        </h1>

        {/* XP badge */}
        {resource.points_on_completion > 0 && !resource.is_consumed && (
          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
            <Zap size={11} /> {resource.points_on_completion} xp
          </span>
        )}

        {/* Completed badge */}
        {resource.is_consumed && (
          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
            <Check size={11} /> Completado
          </span>
        )}
      </div>

      {/* ── Content area ────────────────────────────────────────── */}
      <div
        className={cn(
          'flex-1',
          // Add bottom padding when bottom bar is shown
          !resource.is_consumed && resource.is_unlocked && 'pb-20'
        )}
      >
        {/* Embedded content — full height */}
        {hasEmbeddedContent && detected ? (
          <div style={{ height: 'calc(100vh - 112px)' }}>
            <iframe
              src={detected.embedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        ) : resource.content_url ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
              <ExternalLink className="h-10 w-10 text-slate-400" />
            </div>
            <div className="text-center max-w-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-2">{resource.title}</h2>
              {resource.description && (
                <p className="text-sm text-slate-500 mb-6">{resource.description}</p>
              )}
              <a
                href={resource.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                           bg-gradient-to-r from-sky-500 to-teal-500 text-white
                           font-bold shadow hover:opacity-90 transition-opacity"
              >
                <ExternalLink size={16} />
                Abrir recurso
              </a>
            </div>
          </div>
        ) : resource.storage_path ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Download className="h-10 w-10 text-slate-400" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-800 mb-2">{resource.title}</h2>
              <p className="text-sm text-slate-500">Archivo disponible para descarga.</p>
              <Button variant="outline" className="mt-4">
                <Download className="h-4 w-4 mr-2" />
                Descargar archivo
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <p className="text-slate-500">Contenido no disponible.</p>
          </div>
        )}
      </div>

      {/* ── XP Pop animation ────────────────────────────────────── */}
      <AnimatePresence>
        {xpPop.visible && (
          <motion.div
            key="xp-pop"
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -60, scale: 1.2 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          >
            <span className="text-3xl font-black text-amber-500 drop-shadow-lg">
              +{xpPop.amount} xp ⚡
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BottomBar — completion CTA ──────────────────────────── */}
      {!resource.is_consumed && resource.is_unlocked && (
        <div
          className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t
                     shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex items-center
                     justify-between px-6 z-10"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700">¿Terminaste?</p>
            {resource.points_on_completion > 0 && (
              <p className="text-xs text-slate-400">
                Gana {resource.points_on_completion} puntos al marcarlo como completado.
              </p>
            )}
          </div>
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold shadow
                       bg-gradient-to-r from-sky-500 to-teal-500 text-white text-sm
                       hover:opacity-90 transition-opacity disabled:opacity-60 flex-shrink-0 ml-4"
          >
            {isCompleting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Completando...
              </>
            ) : (
              <>¡Lo completé! →</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
