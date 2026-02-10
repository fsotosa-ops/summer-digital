'use client';

import { detectAndResolveUrl, DetectedResource } from '@/lib/url-detection';
import { ExternalLink, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ResourceContentPreviewProps {
  contentUrl?: string | null;
  storagePath?: string | null;
  compact?: boolean;
}

export function ResourceContentPreview({ contentUrl, storagePath, compact = false }: ResourceContentPreviewProps) {
  const detected = contentUrl ? detectAndResolveUrl(contentUrl) : null;

  if (!detected && !storagePath) {
    return (
      <div className="p-4 text-center text-sm text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
        Sin contenido - agrega una URL o sube un archivo.
      </div>
    );
  }

  if (detected) {
    return <EmbedRenderer detected={detected} compact={compact} sourceUrl={contentUrl!} />;
  }

  if (storagePath) {
    return (
      <div className="p-4 text-center space-y-2 bg-slate-50 rounded-lg border border-slate-200">
        <Download className="h-8 w-8 mx-auto text-slate-400" />
        <p className="text-sm text-slate-500">Archivo subido: <span className="font-mono text-xs">{storagePath.split('/').pop()}</span></p>
      </div>
    );
  }

  return null;
}

function EmbedRenderer({ detected, compact, sourceUrl }: { detected: DetectedResource; compact: boolean; sourceUrl: string }) {
  const height = compact ? '280px' : '400px';
  const videoHeight = compact ? 'h-[200px]' : 'aspect-video';

  // Embeddable types
  if (detected.type === 'youtube' || detected.type === 'vimeo') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{detected.label}</Badge>
        </div>
        <div className={`${videoHeight} w-full rounded-lg overflow-hidden border border-slate-200`}>
          <iframe
            src={detected.embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </div>
    );
  }

  if (detected.type === 'google_slides' || detected.type === 'google_drive_pdf') {
    return (
      <div className="space-y-2">
        <Badge variant="secondary" className="text-xs">{detected.label}</Badge>
        <div className={`${videoHeight} w-full rounded-lg overflow-hidden border border-slate-200`}>
          <iframe
            src={detected.embedUrl}
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (detected.type === 'pdf') {
    return (
      <div className="space-y-2">
        <Badge variant="secondary" className="text-xs">{detected.label}</Badge>
        <div className="w-full rounded-lg overflow-hidden border border-slate-200" style={{ height }}>
          <iframe src={detected.embedUrl} className="w-full h-full" />
        </div>
      </div>
    );
  }

  if (detected.type === 'typeform') {
    return (
      <div className="space-y-2">
        <Badge variant="secondary" className="text-xs">{detected.label}</Badge>
        <div className="w-full rounded-lg overflow-hidden border border-slate-200" style={{ height }}>
          <iframe
            src={detected.embedUrl}
            className="w-full h-full"
            allow="camera; microphone; autoplay; encrypted-media;"
          />
        </div>
      </div>
    );
  }

  if (detected.type === 'kahoot') {
    return (
      <div className="space-y-2">
        <Badge variant="secondary" className="text-xs">{detected.label}</Badge>
        <div className="w-full rounded-lg overflow-hidden border border-slate-200" style={{ height }}>
          <iframe src={detected.embedUrl} className="w-full h-full" allowFullScreen />
        </div>
      </div>
    );
  }

  // Generic link - not embeddable
  return (
    <div className="p-4 text-center space-y-2 bg-slate-50 rounded-lg border border-slate-200">
      <ExternalLink className="h-8 w-8 mx-auto text-slate-400" />
      <p className="text-sm text-slate-500">Se abrira como enlace externo</p>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline truncate block"
      >
        {sourceUrl}
      </a>
    </div>
  );
}
