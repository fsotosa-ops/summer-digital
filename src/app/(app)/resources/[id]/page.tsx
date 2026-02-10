'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { resourceService } from '@/services/resource.service';
import { ApiResourceParticipantRead } from '@/types/api.types';
import { detectAndResolveUrl } from '@/lib/url-detection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = params.id as string;

  const [resource, setResource] = useState<ApiResourceParticipantRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const load = async () => {
      try {
        const data = await resourceService.getMyResource(resourceId);
        setResource(data);

        // Track open
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

      if (resource.points_on_completion > 0) {
        toast.success(`+${resource.points_on_completion} puntos ganados!`);
      } else {
        toast.success('Recurso completado');
      }
    } catch (err) {
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
              <p key={i} className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg inline-block">
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/resources')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="capitalize">
              <TypeIcon className="h-3 w-3 mr-1" />
              {resource.type}
            </Badge>
            {resource.is_consumed && (
              <Badge className="bg-green-600 text-white">
                <Check className="h-3 w-3 mr-1" />
                Completado
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{resource.title}</h1>
          {resource.description && (
            <p className="text-slate-500 mt-1">{resource.description}</p>
          )}
        </div>
      </div>

      {/* Content Area */}
      <Card>
        <CardContent className="p-0">
          {/* Embedded content */}
          {detected && (detected.type === 'youtube' || detected.type === 'vimeo') ? (
            <div className="aspect-video w-full">
              <iframe
                src={detected.embedUrl}
                className="w-full h-full rounded-lg"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : detected && (detected.type === 'google_slides' || detected.type === 'google_drive_pdf') ? (
            <div className="aspect-video w-full">
              <iframe
                src={detected.embedUrl}
                className="w-full h-full rounded-lg"
                allowFullScreen
              />
            </div>
          ) : detected && detected.type === 'pdf' ? (
            <div className="w-full" style={{ height: '80vh' }}>
              <iframe
                src={detected.embedUrl}
                className="w-full h-full rounded-lg"
              />
            </div>
          ) : detected && detected.type === 'typeform' ? (
            <div className="w-full" style={{ height: '70vh' }}>
              <iframe
                src={detected.embedUrl}
                className="w-full h-full rounded-lg"
                allow="camera; microphone; autoplay; encrypted-media;"
              />
            </div>
          ) : detected && detected.type === 'kahoot' ? (
            <div className="w-full" style={{ height: '70vh' }}>
              <iframe
                src={detected.embedUrl}
                className="w-full h-full rounded-lg"
                allowFullScreen
              />
            </div>
          ) : resource.content_url ? (
            <div className="p-8 text-center space-y-4">
              <ExternalLink className="h-12 w-12 mx-auto text-slate-400" />
              <p className="text-slate-600">Este recurso se abre en una nueva ventana.</p>
              <Button asChild>
                <a href={resource.content_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir recurso
                </a>
              </Button>
            </div>
          ) : resource.storage_path ? (
            <div className="p-8 text-center space-y-4">
              <Download className="h-12 w-12 mx-auto text-slate-400" />
              <p className="text-slate-600">Archivo disponible para descarga.</p>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Descargar archivo
              </Button>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-slate-500">Contenido no disponible.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion action */}
      {!resource.is_consumed && (
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
          <div>
            <p className="font-medium text-slate-900">Terminaste de ver este recurso?</p>
            {resource.points_on_completion > 0 && (
              <p className="text-sm text-slate-500">
                Gana {resource.points_on_completion} puntos al marcarlo como completado.
              </p>
            )}
          </div>
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isCompleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Marcar como completado
          </Button>
        </div>
      )}
    </div>
  );
}
