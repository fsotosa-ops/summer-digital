'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { BookOpen, Video, FileText, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface Resource {
    id: number;
    title: string;
    type: 'video' | 'article' | 'pdf';
    description: string;
    points: number;
}

const RESOURCES: Resource[] = [
    { id: 1, title: "Manifiesto de la Fundación Summer", type: "pdf", description: "Documento fundacional sobre nuestros valores.", points: 5 },
    { id: 2, title: "Charla TED: El poder de la vulnerabilidad", type: "video", description: "Brené Brown nos enseña sobre la conexión humana.", points: 5 },
    { id: 3, title: "Guía de Comunicación No Violenta", type: "article", description: "Principios básicos para resolver conflictos.", points: 5 },
    { id: 4, title: "Protocolos de Seguridad Digital", type: "pdf", description: "Cómo protegerte a ti y a tu comunidad en línea.", points: 5 },
    { id: 5, title: "Historia de Katy Summer", type: "video", description: "Conociendo el legado que inspira este movimiento.", points: 5 },
];

export default function ResourcesPage() {
  const { user, addPoints } = useAuthStore();
  const [readResources, setReadResources] = useState<number[]>([]);

  const handleMarkAsRead = (id: number) => {
      if (readResources.includes(id)) return;
      
      setReadResources([...readResources, id]);
      addPoints(5);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Recursos</h1>
          <p className="text-slate-500">Material de apoyo y documentación para tu desarrollo.</p>
        </div>
        {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
            <Button className="bg-slate-900 text-white hover:bg-slate-800">
                + Nuevo Recurso
            </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {RESOURCES.map((resource) => {
            const isRead = readResources.includes(resource.id);
            const Icon = resource.type === 'video' ? Video : resource.type === 'pdf' ? FileText : BookOpen;
            
            return (
                <motion.div 
                    key={resource.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                >
                    <div className="h-32 bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                        <Icon className="w-12 h-12 text-slate-300" />
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded uppercase tracking-wide">
                                {resource.type}
                            </span>
                            {isRead && <span className="text-xs text-slate-400 flex items-center gap-1"><Check size={12} /> Visto</span>}
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2">{resource.title}</h3>
                        <p className="text-sm text-slate-500 mb-4 flex-1">{resource.description}</p>
                        
                        <Button 
                            variant={isRead ? "outline" : "default"}
                            className={isRead ? "border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100" : "bg-slate-900 hover:bg-slate-800 text-white"}
                            onClick={() => handleMarkAsRead(resource.id)}
                            disabled={isRead}
                        >
                            {isRead ? (
                                <>
                                   <Check className="mr-2 h-4 w-4" /> Completado
                                </>
                            ) : (
                                "Marcar como leído (+5 pts)"
                            )}
                        </Button>
                    </div>
                </motion.div>
            );
        })}
      </div>
    </div>
  );
}
