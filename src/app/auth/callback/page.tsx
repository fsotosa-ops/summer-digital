'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/auth.service';
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
        router.push('/dashboard');
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
