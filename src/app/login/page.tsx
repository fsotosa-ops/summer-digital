'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login, register, requestPasswordRecovery, isLoading, error } = useAuthStore();
  const router = useRouter();

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Password recovery state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  // Google OAuth loading
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginEmail, loginPassword);
      router.push('/dashboard');
    } catch {
      // Error handled by store
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(registerEmail, registerPassword, registerName || undefined);
      setRegisterSuccess(true);
    } catch {
      // Error handled by store
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestPasswordRecovery(recoveryEmail);
      setRecoverySent(true);
    } catch {
      // Error handled by store
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const callbackUrl = `${window.location.origin}/auth/callback`;
      const oauthUrl = await authService.getGoogleOAuthUrl(callbackUrl);
      window.location.href = oauthUrl;
    } catch {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Oasis Digital</h1>
          <p className="text-slate-500">Plataforma de bienestar y desarrollo</p>
        </div>

        <Card>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">Bienvenido de vuelta</CardTitle>
                <CardDescription>Ingresa tus credenciales</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Correo electrónico</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-500">O continúa con</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
                    disabled={isLoading || googleLoading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {googleLoading ? 'Redirigiendo...' : 'Google'}
                  </Button>

                  <div className="text-center">
                    <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="text-sm text-slate-500 hover:text-slate-900 underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Recuperar contraseña</DialogTitle>
                          <DialogDescription>
                            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                          </DialogDescription>
                        </DialogHeader>
                        {recoverySent ? (
                          <div className="flex flex-col items-center gap-4 py-4">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                            <p className="text-center text-sm text-slate-600">
                              Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.
                            </p>
                            <Button onClick={() => { setRecoveryOpen(false); setRecoverySent(false); }}>
                              Cerrar
                            </Button>
                          </div>
                        ) : (
                          <form onSubmit={handlePasswordRecovery} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="recovery-email">Correo electrónico</Label>
                              <Input
                                id="recovery-email"
                                type="email"
                                placeholder="tu@email.com"
                                value={recoveryEmail}
                                onChange={(e) => setRecoveryEmail(e.target.value)}
                                required
                                disabled={isLoading}
                              />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                              {isLoading ? 'Enviando...' : 'Enviar enlace'}
                            </Button>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="register">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">Crear cuenta</CardTitle>
                <CardDescription>Únete a la comunidad Oasis</CardDescription>
              </CardHeader>
              <CardContent>
                {registerSuccess ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                    <p className="text-center text-slate-600">
                      Cuenta creada exitosamente. Revisa tu correo para verificar tu cuenta, luego inicia sesión.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nombre completo</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Tu nombre"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email">Correo electrónico</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Contraseña</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={isLoading}
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-500">O regístrate con</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleLogin}
                      disabled={isLoading || googleLoading}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      {googleLoading ? 'Redirigiendo...' : 'Google'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
