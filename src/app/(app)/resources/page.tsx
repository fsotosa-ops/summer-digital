'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '@/components/ui/animated-button';
import { BookOpen, Video, FileText, Check, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { resourceService } from '@/services/resource.service';

interface Resource {
    id: number;
    title: string;
    type: 'video' | 'article' | 'pdf';
    description: string;
    points: number;
    min_score?: number;
}

const RESOURCES: Resource[] = [
    { id: 1, title: "Manifiesto de la Fundación Summer", type: "pdf", description: "Documento fundacional sobre nuestros valores.", points: 5, min_score: 0 },
    { id: 2, title: "Charla TED: El poder de la vulnerabilidad", type: "video", description: "Brené Brown nos enseña sobre la conexión humana.", points: 5, min_score: 10 },
    { id: 3, title: "Guía de Comunicación No Violenta", type: "article", description: "Principios básicos para resolver conflictos.", points: 5, min_score: 20 },
    { id: 4, title: "Protocolos de Seguridad Digital", type: "pdf", description: "Cómo protegerte a ti y a tu comunidad en línea.", points: 5, min_score: 30 },
    { id: 5, title: "Historia de Katy Summer", type: "video", description: "Conociendo el legado que inspira este movimiento.", points: 5, min_score: 50 },
];

export default function ResourcesPage() {
  const { user, addPoints } = useAuthStore();
  const [readResources, setReadResources] = useState<number[]>([]);
  const [resources, setResources] = useState(RESOURCES); // Local state for optimistic updates
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleMarkAsRead = (id: number) => {
      if (readResources.includes(id)) return;
      
      setReadResources([...readResources, id]);
      addPoints(5);
  };

  const handleScoreUpdate = async (id: number, newScore: number) => {
      // Optimistic update
      setResources(prev => prev.map(r => r.id === id ? { ...r, min_score: newScore } : r));
      setEditingId(null);
      
      // Backend update
      await resourceService.updateResource(id, { min_score: newScore });
  };

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">Recursos de Aprendizaje</h1>
           <p className="text-slate-500 mt-2">Herramientas y guías desbloqueables según tu nivel.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
           <span className="text-sm font-medium text-slate-600">Tu Score Actual:</span>
           <span className="text-lg font-bold text-brand">{user?.oasisScore || 0} pts</span>
        </div>
        {isAdmin && (
            <Button className="bg-slate-900 text-white hover:bg-slate-800">
                + Nuevo Recurso
            </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource) => {
            const isRead = readResources.includes(resource.id);
            const Icon = resource.type === 'video' ? Video : resource.type === 'pdf' ? FileText : BookOpen;
            
            const userScore = user?.oasisScore || 0;
            const requiredScore = resource.min_score || 0;
            const isLocked = userScore < requiredScore && !isAdmin;
            const progress = Math.min((userScore / requiredScore) * 100, 100);

            return (
                <motion.div 
                    key={resource.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    className={cn(
                        "bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col transition-all duration-300 relative group",
                        isLocked ? "border-slate-200" : "border-slate-200 hover:shadow-lg hover:border-fuchsia-100"
                    )}
                >
                    {/* Locked Overlay */}
                    {isLocked && (
                        <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3 shadow-inner">
                                <Lock className="text-slate-500 w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-700">Contenido Bloqueado</h3>
                            <p className="text-sm text-slate-500 mb-4">Necesitas {requiredScore} puntos para desbloquear</p>
                            
                            <div className="w-full max-w-[150px] h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-fuchsia-500" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-xs text-fuchsia-600 mt-1 font-medium">{Math.floor(progress)}% completado</p>
                        </div>
                    )}

                    <div className={cn("h-32 border-b border-slate-100 flex items-center justify-center relative bg-slate-50")}>
                         <Icon className={cn("w-12 h-12", isLocked ? "text-slate-300" : "text-fuchsia-600")} />
                         
                         {/* Admin Min Score Edit */}
                         {isAdmin && (
                            <div className="absolute top-2 right-2 z-20">
                                {editingId === resource.id ? (
                                    <input 
                                       type="number" 
                                       className="w-16 text-xs border rounded p-1"
                                       defaultValue={resource.min_score}
                                       onBlur={(e) => handleScoreUpdate(resource.id, parseInt(e.target.value) || 0)}
                                       autoFocus
                                    />
                                ) : (
                                    <Badge 
                                        variant="outline" 
                                        className="bg-white/80 backdrop-blur cursor-pointer hover:bg-slate-100"
                                        onClick={() => setEditingId(resource.id)}
                                    >
                                        Min: {resource.min_score || 0}
                                    </Badge>
                                )}
                            </div>
                         )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                            <span className={cn(
                                "text-xs font-semibold px-2 py-1 rounded uppercase tracking-wide",
                                isLocked ? "bg-slate-100 text-slate-400" : "bg-brand/10 text-brand"
                            )}>
                                {resource.type}
                            </span>
                            {isRead && <span className="text-xs text-fuchsia-600 flex items-center gap-1 font-medium"><Check size={12} /> Visto</span>}
                        </div>
                        
                        <h3 className={cn("font-bold mb-2 text-lg leading-tight", isLocked ? "text-slate-400" : "text-slate-800")}>
                            {resource.title}
                        </h3>
                        
                        <p className={cn("text-sm mb-4 flex-1 line-clamp-3", isLocked ? "text-slate-400" : "text-slate-500")}>
                            {resource.description}
                        </p>
                        
                        <AnimatedButton
                            variant={isRead ? "outline" : "default"}
                            className={cn(
                                "w-full",
                                isRead ? "border-fuchsia-200 text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100" : "bg-slate-900 hover:bg-slate-800 text-white"
                            )}
                            onClick={() => handleMarkAsRead(resource.id)}
                            disabled={isRead || isLocked}
                        >
                            {isRead ? (
                                <>
                                   <Check className="mr-2 h-4 w-4" /> Completado
                                </>
                            ) : (
                                "Marcar como leído (+5 pts)"
                            )}
                        </AnimatedButton>
                    </div>
                </motion.div>
            );
        })}
      </div>
    </div>
  );
}
