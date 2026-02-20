'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, Activity, Settings2 } from 'lucide-react';
import { ContactsTab } from './tabs/ContactsTab';
import { OrganizationsTab } from './tabs/OrganizationsTab';
import { ActivityTab } from './tabs/ActivityTab';
import { FieldOptionsTab } from './tabs/FieldOptionsTab';
import { SectionHeader } from '@/components/ui/section-header';
import { useAuthStore } from '@/store/useAuthStore';

const TAB_TRIGGER =
  'rounded-lg gap-2 px-4 py-2 text-sm ' +
  'data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-600 data-[state=active]:to-purple-600 ' +
  'data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-medium ' +
  'text-slate-500 hover:text-slate-700';

export function CRMHub() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const [activeTab, setActiveTab] = useState('contacts');

  return (
    <div className="space-y-6">
      <SectionHeader
        title="CRM"
        description="Centro de gestión de contactos, organizaciones y actividad."
        icon={<Users className="h-5 w-5" />}
        className="mb-2"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-xl h-auto">
          <TabsTrigger value="contacts" className={TAB_TRIGGER}>
            <Users className="h-4 w-4" />
            Contactos
          </TabsTrigger>
          <TabsTrigger value="organizations" className={TAB_TRIGGER}>
            <Building2 className="h-4 w-4" />
            Organizaciones
          </TabsTrigger>
          <TabsTrigger value="activity" className={TAB_TRIGGER}>
            <Activity className="h-4 w-4" />
            Actividad
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="field-options" className={TAB_TRIGGER}>
              <Settings2 className="h-4 w-4" />
              Opciones de Campo
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="contacts">
          <ContactsTab />
        </TabsContent>

        <TabsContent value="organizations">
          <OrganizationsTab />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="field-options">
            <FieldOptionsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
