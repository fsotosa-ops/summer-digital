'use client';

import { useEffect, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { JourneyMap } from '@/features/journey/components/JourneyMap';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, Clock } from 'lucide-react';
import ReactConfetti from 'react-confetti';
import { useWindowSize } from 'react-use'; // You might need to install this or implement a hook. Using rough hook for now or standard comp.

// Simple window size hook if react-use not available
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
  const { journeys, fetchJourneys, selectedJourneyId, selectJourney, isLoading } = useJourneyStore();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    fetchJourneys();
  }, [fetchJourneys]);

  if (isLoading) return <div className="p-8 text-center text-slate-400">Cargando tus viajes...</div>;

  // If a journey is selected, show the map.
  if (selectedJourneyId) {
    const activeJourney = journeys.find(j => j.id === selectedJourneyId);
    
    return (
      <div className="space-y-4">
        {/* Confetti conditionally */}
        {activeJourney?.status === 'completed' && activeJourney.progress === 100 && (
             <div className="fixed inset-0 pointer-events-none z-50">
                 <ReactConfetti width={width} height={height} recycle={false} numberOfPieces={500} />
             </div>
        )}
        
        <div className="flex justify-between items-center mb-2">
             <h2 className="text-xl font-bold text-slate-800">{activeJourney?.title}</h2>
             <Badge variant={activeJourney?.status === 'completed' ? "default" : "secondary"}>
                {activeJourney?.status === 'completed' ? "Completado" : "En Progreso"}
             </Badge>
        </div>

        <JourneyMap />
      </div>
    );
  }

  const activeJourneys = journeys.filter(j => j.status === 'active');
  const completedJourneys = journeys.filter(j => j.status === 'completed');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Active Journeys Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
            <Play className="text-teal-500" />
            <h1 className="text-2xl font-bold text-slate-900">Mis Viajes Activos</h1>
        </div>
        
        {activeJourneys.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeJourneys.map(journey => (
                    <Card key={journey.id} className="border-teal-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => selectJourney(journey.id)}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="mb-2 bg-teal-50 text-teal-700 border-teal-200">
                                    {journey.category || "General"}
                                </Badge>
                                <span className="text-xs font-semibold text-teal-600">{journey.progress}%</span>
                            </div>
                            <CardTitle className="text-lg text-slate-800">{journey.title}</CardTitle>
                            <CardDescription className="line-clamp-2">{journey.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                            <Progress value={journey.progress} className="h-2 bg-slate-100" indicatorClassName="bg-teal-500" />
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white group">
                                Continuar <Play size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        ) : (
            <div className="p-10 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-slate-500">
                No tienes viajes activos en este momento. ¡Explora el catálogo!
            </div>
        )}
      </section>

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
