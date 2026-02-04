import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { Clock, Target } from "lucide-react";
import { UserActivityLog } from "@/types";

// Mock Data for the prototype (In real app, fetch from backend using userId)
const MOCK_ACTIVITY_LOG: UserActivityLog[] = [
    { id: '1', userId: '1', activityType: 'journey_step', description: 'Completó "Cuestionario Inicial"', date: '2026-02-03T10:00:00', scoreEarned: 10 },
    { id: '2', userId: '1', activityType: 'resource_view', description: 'Leyó "Guía de Empatía"', date: '2026-02-02T15:30:00', scoreEarned: 5 },
    { id: '3', userId: '1', activityType: 'login', description: 'Inicio de Sesión', date: '2026-02-01T09:00:00' },
    { id: '4', userId: '1', activityType: 'medal_earned', description: 'Obtuvo medalla "Pionero"', date: '2026-01-28T14:15:00', scoreEarned: 50 },
];

export interface CRMUser {
    id: number;
    name: string;
    org: string;
    score: number;
    rank: string;
    status: string;
    lastSeen: string;
    daysInactive: number;
}

interface UserProfileSheetProps {
  user: CRMUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileSheet({ user, open, onOpenChange }: UserProfileSheetProps) {
  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4 border-4 border-slate-50 shadow-lg">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${user.id}`} />
                <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <SheetTitle className="text-2xl font-bold text-slate-900">{user.name}</SheetTitle>
            <SheetDescription className="text-slate-500 font-medium">{user.org}</SheetDescription>
            
            <div className="flex gap-2 mt-3">
                 <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 px-3 py-1">
                    {user.rank}
                 </Badge>
                 <Badge variant={user.status === 'Activo' ? 'default' : 'secondary'} className={user.status === 'Activo' ? 'bg-green-600' : ''}>
                    {user.status}
                 </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
            {/* Oasis Score Breakdown */}
            <section className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Target size={16} /> Análisis de Oasis Score
                </h3>
                <div className="flex items-end justify-between mb-2">
                    <span className="text-3xl font-bold text-slate-800">{user.score}</span>
                    <span className="text-sm text-slate-400 mb-1">/ 100 Puntos</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
                     <div className="h-full bg-teal-500 rounded-full" style={{ width: `${user.score}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex justify-between p-2 bg-white rounded border border-slate-100">
                        <span className="text-slate-500">Actividades</span>
                        <span className="font-semibold text-slate-700">65%</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white rounded border border-slate-100">
                        <span className="text-slate-500">Recursos</span>
                        <span className="font-semibold text-slate-700">20%</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white rounded border border-slate-100">
                        <span className="text-slate-500">Eventos</span>
                        <span className="font-semibold text-slate-700">10%</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white rounded border border-slate-100">
                        <span className="text-slate-500">Bonus</span>
                        <span className="font-semibold text-slate-700">5%</span>
                    </div>
                </div>
            </section>

            {/* Activity Log */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={16} /> Historial de Actividad
                    </h3>
                </div>
                
                <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
                    {MOCK_ACTIVITY_LOG.map((log) => (
                        <div key={log.id} className="relative">
                            <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white ring-1 ring-slate-200 bg-teal-500"></div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400 font-medium">
                                    {new Date(log.date).toLocaleDateString()} • {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <p className="text-sm font-medium text-slate-700">{log.description}</p>
                                {log.scoreEarned && (
                                    <span className="inline-flex items-center text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded w-fit">
                                        +{log.scoreEarned} pts
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
