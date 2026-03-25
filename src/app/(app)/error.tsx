'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-summer-yellow" />
      <h2 className="text-xl font-semibold text-slate-800">
        Algo salió mal
      </h2>
      <p className="max-w-md text-sm text-slate-500">
        Ocurrió un error inesperado. Puedes intentar de nuevo o recargar la
        página.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          Reintentar
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline">
          Recargar página
        </Button>
      </div>
    </div>
  );
}
