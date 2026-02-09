'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersTab } from '@/features/admin/components/UsersTab';
import { OrganizationsTab } from '@/features/admin/components/OrganizationsTab';
import { MonitorCheck, Building2, Users } from 'lucide-react';

export default function AdminEntitiesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('organizations');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && user && user.role !== 'SuperAdmin' && user.role !== 'Admin') {
       router.push('/dashboard');
    }
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return null;
  }

  // Only SuperAdmin can see everything? Or Admin too?
  // NavItems allowedRoles: ['Admin', 'SuperAdmin']
  // But strictly `isSuperAdmin` checks in components might restrict access.
  // We'll let the components handle their specific permissions if needed, 
  // but generally this page is for admins.

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <MonitorCheck className="h-8 w-8 text-teal-600" />
          Gestión de Entidades
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl">
          Administra usuarios, organizaciones y sus permisos desde un panel unificado.
        </p>
      </div>

      <Tabs defaultValue="organizations" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] h-12 p-1 bg-slate-100/80 backdrop-blur-sm rounded-xl">
          <TabsTrigger 
            value="organizations"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Organizaciones
          </TabsTrigger>
          <TabsTrigger 
            value="users"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Users className="w-4 h-4 mr-2" />
            Usuarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="outline-none min-h-[500px]">
          <OrganizationsTab />
        </TabsContent>
        
        <TabsContent value="users" className="outline-none min-h-[500px]">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
