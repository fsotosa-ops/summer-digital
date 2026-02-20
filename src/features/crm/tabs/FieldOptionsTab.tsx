'use client';

import { FieldOptionsManager } from '../components/FieldOptionsManager';
import { SectionHeader } from '@/components/ui/section-header';
import { Settings2 } from 'lucide-react';

export function FieldOptionsTab() {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Opciones de Campo"
        description="Configura los valores disponibles para los campos de perfil CRM: género, nivel educativo y ocupación."
        icon={<Settings2 className="h-5 w-5" />}
        className="mb-2"
      />
      <FieldOptionsManager />
    </div>
  );
}
