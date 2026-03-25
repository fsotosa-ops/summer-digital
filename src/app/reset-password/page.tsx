'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { PASSWORD_RULES, validatePassword } from '@/lib/password-validation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { valid: passwordValid, results: ruleResults } = validatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = passwordValid && passwordsMatch && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setError(null);

    try {
      await authService.updatePassword(password);
      setSuccess(true);
      // Limpiar tokens - el usuario debe iniciar sesión con la nueva contraseña
      apiClient.clearTokens();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-summer-pink/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-summer-sky/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Summer UP</h1>
          <p className="text-slate-500">Restablecer contraseña</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl p-6">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-center text-slate-600">
                Tu contraseña ha sido actualizada exitosamente.
              </p>
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-gradient-to-r from-summer-pink to-summer-pink hover:from-summer-pink hover:to-summer-pink border-0 text-white shadow-md"
              >
                Iniciar sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <PasswordInput
                  id="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  showCopy
                />
              </div>

              {/* Indicador de requisitos */}
              {password.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {PASSWORD_RULES.map((rule, i) => (
                    <li key={i} className="flex items-center gap-2">
                      {ruleResults[i] ? (
                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                      ) : (
                        <Circle size={14} className="text-slate-300 shrink-0" />
                      )}
                      <span className={ruleResults[i] ? 'text-green-700' : 'text-slate-500'}>
                        {rule.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                <PasswordInput
                  id="confirm-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-sm text-red-500">Las contraseñas no coinciden</p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-summer-pink to-summer-pink hover:from-summer-pink hover:to-summer-pink border-0 text-white shadow-md transition-transform hover:-translate-y-0.5"
                disabled={!canSubmit || isLoading}
              >
                {isLoading ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-slate-500 hover:text-summer-pink underline transition-colors"
                  onClick={() => router.push('/login')}
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
