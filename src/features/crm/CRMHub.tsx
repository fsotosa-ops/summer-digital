'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, Activity } from 'lucide-react';
import { ContactsTab } from './tabs/ContactsTab';
import { OrganizationsTab } from './tabs/OrganizationsTab';
import { ActivityTab } from './tabs/ActivityTab';

export function CRMHub() {
  const [activeTab, setActiveTab] = useState('contacts');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
        <p className="text-slate-500">
          Centro de gestión de contactos, organizaciones y actividad.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger
            value="contacts"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <Users className="h-4 w-4" />
            Contactos
          </TabsTrigger>
          <TabsTrigger
            value="organizations"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <Building2 className="h-4 w-4" />
            Organizaciones
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <Activity className="h-4 w-4" />
            Actividad
          </TabsTrigger>
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
      </Tabs>
    </div>
  );
}
