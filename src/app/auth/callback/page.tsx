'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/auth.service';
import { SESSION_KEYS } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');

      if (!code) {
        setError('No se recibió código de autorización');
        return;
      }

      try {
        const user = await authService.handleOAuthCallback(code);
        setUser(user);

        // Fresh login → clear stale onboarding flag so MainLayout re-checks
        sessionStorage.removeItem(SESSION_KEYS.ONBOARDING_CHECKED);

        // Recuperar si el usuario venía de un evento / QR / join intent
        const qrReturn = sessionStorage.getItem(SESSION_KEYS.QR_RETURN_URL);
        const joinEventId = sessionStorage.getItem(SESSION_KEYS.JOIN_EVENT);

        if (qrReturn) {
          sessionStorage.removeItem(SESSION_KEYS.QR_RETURN_URL);
          router.push(qrReturn);
        } else if (joinEventId) {
          sessionStorage.removeItem(SESSION_KEYS.JOIN_EVENT);
          router.push(`/events/${joinEventId}`);
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al procesar autenticación');
      }
    };

    handleCallback();
  }, [searchParams, setUser, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold text-red-600">Error de autenticación</h1>
          <p className="text-slate-600">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-slate-900 underline hover:no-underline"
          >
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-600" />
        <p className="text-slate-600">Procesando autenticación...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-600" />
            <p className="text-slate-600">Cargando...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}