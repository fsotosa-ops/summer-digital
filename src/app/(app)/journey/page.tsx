'use client';

import { useEffect, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { journeyService } from '@/services/journey.service';
import { organizationService } from '@/services/organization.service';
import { ApiJourneyRead, ApiOrganization } from '@/types/api.types';
import { JourneyMap } from '@/features/journey/components/JourneyMap';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, CheckCircle, Clock, Compass, Loader2, Plus, Building2, AlertCircle, Star } from 'lucide-react';
import ReactConfetti from 'react-confetti';

function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
  useEffect(() => {
    function handleResize() { setWindowDimensions({ width: window.innerWidth, height: window.innerHeight }); }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowDimensions;
}

export default function JourneyPage() {
  const { user } = useAuthStore();
  const { journeys, fetchJourneys, fetchJourneysForAdmin, selectedJourneyId, selectJourney, isLoading, isPreviewMode } = useJourneyStore();
  const { width, height } = useWindowDimensions();

  const [availableJourneys, setAvailableJourneys] = useState<ApiJourneyRead[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // For SuperAdmin: org selector
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const orgId = selectedOrgId || user?.organizationId;

  // Load organizations for all users (needed for multi-org participants)
  useEffect(() => {
    const loadOrgs = async () => {
      if (!user) return;
      setLoadingOrgs(true);
      try {
        const orgs = await organizationService.listMyOrganizations();
        setOrganizations(orgs);
        if (isSuperAdmin && orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0].id);
        }
      } catch (err) {
        console.error('Error loading organizations:', err);
      } finally {
        setLoadingOrgs(false);
      }
    };
    loadOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isSuperAdmin]);

  // Fetch journeys based on role
  useEffect(() => {
    if (isSuperAdmin) {
      if (!orgId) return;
      fetchJourneysForAdmin(orgId);
    } else {
      // Participants: fetch based on enrollments (multi-org aware via enrollment.organization_id)
      fetchJourneys(orgId);
    }
  }, [fetchJourneys, fetchJourneysForAdmin, orgId, isSuperAdmin]);

  // Load available journeys for enrollment (from ALL user orgs, after enrolled journeys are loaded)
  useEffect(() => {
    const loadAvailable = async () => {
      if (isSuperAdmin || organizations.length === 0 || isLoading) return;
      setLoadingAvailable(true);
      try {
        const orgIds = organizations.map(o => o.id);
        const all = await journeyService.listAvailableJourneysMultiOrg(orgIds);
        // Filter out journeys user is already enrolled in
        const enrolledIds = new Set(journeys.map(j => j.id));
        const notEnrolled = all.filter(j => !enrolledIds.has(j.id) && j.is_active);
        setAvailableJourneys(notEnrolled);
      } catch (err) {
        console.error('Error loading available journeys:', err);
      } finally {
        setLoadingAvailable(false);
      }
    };
    loadAvailable();
  }, [organizations, journeys, isSuperAdmin, isLoading]);

  const handleEnroll = async (journeyId: string) => {
    setEnrollingId(journeyId);
    setEnrollError(null);
    try {
      await journeyService.enrollInJourney(journeyId);
      await fetchJourneys(orgId);
      setAvailableJourneys(prev => prev.filter(j => j.id !== journeyId));
    } catch (err) {
      console.error('Error enrolling:', err);
      setEnrollError('No se pudo inscribir. Verifica que seas miembro de la organizacion.');
    } finally {
      setEnrollingId(null);
    }
  };

  // Show message if no organization (after orgs loaded)
  if (!orgId && !isSuperAdmin && !loadingOrgs && organizations.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Sin organizacion asignada</h2>
        <p className="text-slate-500">
          Necesitas pertenecer a una organizacion para ver los journeys disponibles.
          Contacta a tu administrador.
        </p>
      </div>
    );
  }

  if (isLoading || loadingOrgs) {
    return <div className="p-8 text-center text-slate-400">Cargando tus viajes...</div>;
  }

  // If a journey is selected, show the map.
  if (selectedJourneyId) {
    const activeJourney = journeys.find(j => j.id === selectedJourneyId);
    const completedSteps = activeJourney?.nodes.filter(n => n.status === 'completed').length ?? 0;
    const totalSteps = activeJourney?.nodes.length ?? 0;
    const xpEarned = activeJourney?.nodes
      .filter(n => n.status === 'completed')
      .reduce((sum, n) => sum + (n.points || 0), 0) ?? 0;

    return (
      <div className="space-y-4">
        {activeJourney?.status === 'completed' && activeJourney.progress === 100 && (
             <div className="fixed inset-0 pointer-events-none z-50">
                 <ReactConfetti width={width} height={height} recycle={false} numberOfPieces={500} />
             </div>
        )}

        {/* Journey Header Bar */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-slate-800 truncate">{activeJourney?.title}</h2>
              <span className="text-sm font-semibold text-teal-600 ml-3 flex-shrink-0">
                Paso {completedSteps} / {totalSteps}
              </span>
            </div>
            <Progress
              value={activeJourney?.progress ?? 0}
              className="h-2 bg-slate-100"
              indicatorClassName="bg-teal-500"
            />
          </div>
          {xpEarned > 0 && (
            <div className="flex-shrink-0 flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">
              <Star className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-bold text-teal-700">{xpEarned} XP</span>
            </div>
          )}
          {activeJourney?.status === 'completed' && (
            <Badge className="bg-teal-500 text-white flex-shrink-0">Completado</Badge>
          )}
        </div>

        <JourneyMap />
      </div>
    );
  }

  const activeJourneys = journeys.filter(j => j.status === 'active');
  const completedJourneys = journeys.filter(j => j.status === 'completed');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* SuperAdmin Org Selector */}
      {isSuperAdmin && organizations.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-600">Ver journeys de:</span>
            <Select value={selectedOrgId || ''} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecciona organizacion" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Modo Vista Previa
          </Badge>
        </div>
      )}

      {/* Error message */}
      {enrollError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {enrollError}
        </div>
      )}

      {/* Active Journeys Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <Play className="text-teal-500" />
                <h1 className="text-2xl font-bold text-slate-900">
                  {isSuperAdmin ? 'Journeys de la Organizacion' : 'Mis Viajes Activos'}
                </h1>
            </div>
        </div>

        {(isSuperAdmin ? journeys : activeJourneys).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(isSuperAdmin ? journeys : activeJourneys).map(journey => (
                    <Card
                      key={journey.id}
                      className={`shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                        isSuperAdmin ? 'border-purple-100' : 'border-teal-100'
                      }`}
                      onClick={() => selectJourney(journey.id)}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className={`mb-2 ${
                                  isSuperAdmin
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-teal-50 text-teal-700 border-teal-200'
                                }`}>
                                    {journey.category || "General"}
                                </Badge>
                                {isSuperAdmin ? (
                                  <Badge variant="outline" className="text-xs">
                                    {journey.nodes.length} pasos
                                  </Badge>
                                ) : (
                                  <span className="text-xs font-semibold text-teal-600">{journey.progress}%</span>
                                )}
                            </div>
                            <CardTitle className="text-lg text-slate-800">{journey.title}</CardTitle>
                            <CardDescription className="line-clamp-2">{journey.description}</CardDescription>
                        </CardHeader>
                        {!isSuperAdmin && (
                          <CardContent className="pb-2">
                              <Progress value={journey.progress} className="h-2 bg-slate-100" indicatorClassName="bg-teal-500" />
                          </CardContent>
                        )}
                        <CardFooter>
                            <Button className={`w-full group ${
                              isSuperAdmin
                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}>
                                {isSuperAdmin ? 'Ver Preview' : 'Continuar'}
                                <Play size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        ) : (
            <div className="p-10 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-slate-500">
                {isSuperAdmin
                  ? 'No hay journeys en esta organizacion. Crea uno desde el menu Journeys.'
                  : 'No tienes viajes activos. Explora los disponibles abajo para comenzar.'}
            </div>
        )}
      </section>

      {/* Available Journeys Section - Only show for non-SuperAdmin or if SuperAdmin is member of org */}
      {!isSuperAdmin && (
        <section className="pt-8 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4">
              <Compass className="text-amber-500" />
              <h2 className="text-xl font-bold text-slate-700">Journeys Disponibles</h2>
          </div>

          {loadingAvailable ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : availableJourneys.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableJourneys.map(journey => (
                      <Card key={journey.id} className="border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                  <Badge variant="outline" className="mb-2 bg-amber-50 text-amber-700 border-amber-200">
                                      {journey.category || "General"}
                                  </Badge>
                                  <span className="text-xs text-slate-500">{journey.total_steps} pasos</span>
                              </div>
                              <CardTitle className="text-lg text-slate-800">{journey.title}</CardTitle>
                              <CardDescription className="line-clamp-2">{journey.description || 'Sin descripcion'}</CardDescription>
                          </CardHeader>
                          <CardFooter>
                              <Button
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                onClick={() => handleEnroll(journey.id)}
                                disabled={enrollingId === journey.id}
                              >
                                  {enrollingId === journey.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Inscribiendo...
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={14} className="mr-2" />
                                      Inscribirme
                                    </>
                                  )}
                              </Button>
                          </CardFooter>
                      </Card>
                  ))}
              </div>
          ) : (
              <div className="p-10 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-slate-500">
                  No hay mas journeys disponibles en este momento.
              </div>
          )}
        </section>
      )}

      {/* History Section */}
      {completedJourneys.length > 0 && (
          <section className="pt-8 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-4">
                <Clock className="text-slate-400" />
                <h2 className="text-xl font-bold text-slate-700">Historial de Aprendizaje</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-80 hover:opacity-100 transition-opacity">
                 {completedJourneys.map(journey => (
                    <Card key={journey.id} className="bg-slate-50 border-slate-200">
                        <CardHeader className="pb-2">
                             <div className="flex justify-between">
                                <Badge variant="secondary" className="bg-slate-200 text-slate-600">Finalizado</Badge>
                                <CheckCircle className="text-green-500 h-5 w-5" />
                             </div>
                             <CardTitle className="text-base text-slate-600 font-medium">{journey.title}</CardTitle>
                        </CardHeader>
                        <CardFooter>
                             <Button variant="ghost" className="w-full text-slate-500 hover:text-teal-600 text-sm" onClick={() => selectJourney(journey.id)}>
                                 Ver Certificado / Repasar
                             </Button>
                        </CardFooter>
                    </Card>
                 ))}
            </div>
          </section>
      )}
    </div>
  );
}
