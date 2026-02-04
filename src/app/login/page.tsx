'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { User, Shield, Crown, UserPlus } from 'lucide-react';

const PROFILES: { role: UserRole; label: string; icon: React.ElementType; description: string }[] = [
  { 
    role: 'Subscriber', 
    label: 'Suscriptor (Nuevo)', 
    icon: UserPlus, 
    description: 'Usuario nuevo sin viaje iniciado.' 
  },
  { 
    role: 'Participant', 
    label: 'Participante', 
    icon: User, 
    description: 'Usuario activo avanzando en el viaje.' 
  },
  { 
    role: 'Admin', 
    label: 'Administrador', 
    icon: Shield, 
    description: 'Gestión de usuarios básica.' 
  },
  { 
    role: 'SuperAdmin', 
    label: 'Super Admin', 
    icon: Crown, 
    description: 'Acceso total al CRM.' 
  },
];

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleLogin = async (role: string) => {
    await login(role);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
           <h1 className="text-3xl font-bold text-slate-900">Oasis Digital - Dev Login</h1>
           <p className="text-slate-500">Selecciona un perfil para probar la aplicación.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROFILES.map((profile) => (
            <Card 
              key={profile.role} 
              className="cursor-pointer hover:border-slate-400 transition-all hover:shadow-md"
              onClick={() => !isLoading && handleLogin(profile.role)}
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                   <profile.icon className="text-slate-700" size={24} />
                </div>
                <CardTitle className="text-lg">{profile.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                 <CardDescription>{profile.description}</CardDescription>
                 <Button 
                    className="w-full mt-4 bg-slate-900 hover:bg-slate-800" 
                    disabled={isLoading}
                 >
                    Ingresar
                 </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
