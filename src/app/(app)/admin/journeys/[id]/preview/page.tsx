'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { adminService } from '@/services/admin.service';
import { organizationService } from '@/services/organization.service';
import { mapAdminDataToPreviewJourney } from '@/lib/mappers';
import { Journey } from '@/types';
import { JourneyPreviewMap } from '@/features/journey/components/JourneyPreviewMap';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function JourneyPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const journeyId = params.id as string;

  const [previewJourney, setPreviewJourney] = useState<Journey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreviewData = async () => {
      setIsLoading(true);
      try {
        if (user?.organizationId) {
          const [journeyData, stepsData] = await Promise.all([
            adminService.getJourney(user.organizationId, journeyId),
            adminService.listSteps(user.organizationId, journeyId),
          ]);
          const sorted = stepsData.sort((a, b) => a.order_index - b.order_index);
          setPreviewJourney(mapAdminDataToPreviewJourney(journeyData, sorted));
        } else {
          // SuperAdmin without org membership — discover org from journey
          const orgs = await organizationService.listMyOrganizations();
          for (const org of orgs) {
            try {
              const [journeyData, stepsData] = await Promise.all([
                adminService.getJourney(org.id, journeyId),
                adminService.listSteps(org.id, journeyId),
              ]);
              const sorted = stepsData.sort((a, b) => a.order_index - b.order_index);
              setPreviewJourney(mapAdminDataToPreviewJourney(journeyData, sorted));
              break;
            } catch {
              continue;
            }
          }
        }
      } catch {
        setError('No se pudo cargar el journey para vista previa');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreviewData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId, user?.organizationId]);

  if (!user || (user.role !== 'SuperAdmin' && user.role !== 'Admin')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Acceso denegado</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !previewJourney) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <p className="text-red-600">{error || 'No se encontró el journey'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <JourneyPreviewMap
      initialJourney={previewJourney}
      onBack={() => router.push(`/admin/journeys/${journeyId}`)}
    />
  );
}
