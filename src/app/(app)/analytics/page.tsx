'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { analyticsService } from '@/services/analytics.service';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';
import { embedDashboard } from '@superset-ui/embedded-sdk';

const SUPERSET_URL = process.env.NEXT_PUBLIC_SUPERSET_URL || '';
const DASHBOARD_ID = process.env.NEXT_PUBLIC_SUPERSET_DASHBOARD_ID || '';

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasAccess = user?.role === 'SuperAdmin';

  useEffect(() => {
    if (!hasAccess) return;
    if (!containerRef.current || !SUPERSET_URL || !DASHBOARD_ID) {
      const timer = setTimeout(() => {
        setLoading(false);
        if (!SUPERSET_URL || !DASHBOARD_ID) {
          setError('Superset no esta configurado. Verifica las variables de entorno.');
        }
      }, 0);
      return () => clearTimeout(timer);
      return;
    }

    let mounted = true;

    const initDashboard = async () => {
      try {
        await embedDashboard({
          id: DASHBOARD_ID,
          supersetDomain: SUPERSET_URL,
          mountPoint: containerRef.current!,
          fetchGuestToken: () => analyticsService.getGuestToken(),
          dashboardUiConfig: {
            hideTitle: true,
            hideChartControls: false,
            hideTab: false,
          },
        });
        if (mounted) {
          setLoading(false);
          setError(null);
          const iframe = containerRef.current?.querySelector('iframe');
          if (iframe) {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
          }
        }
      } catch (err) {
        console.error('Error embedding Superset dashboard:', err);
        if (mounted) {
          setLoading(false);
          setError(
            err instanceof Error
              ? err.message
              : 'Error al cargar el dashboard de Superset.',
          );
        }
      }
    };

    initDashboard();

    return () => {
      mounted = false;
    };
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Acceso Restringido</h1>
        <p className="text-slate-500">No tienes permisos para ver esta seccion.</p>
        <Link href="/dashboard">
          <Button>Volver al Inicio</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Analitica Avanzada
        </h1>
        <p className="text-slate-500">Vision global del impacto de la Fundacion.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[800px] relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600 mb-3" />
            <p className="text-slate-500">Cargando dashboard...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
            <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
            <p className="text-red-600 font-medium mb-1">
              Error al cargar el dashboard
            </p>
            <p className="text-slate-500 text-sm max-w-md text-center">
              {error}
            </p>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
