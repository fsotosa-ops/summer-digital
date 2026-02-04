'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { JourneyNode } from '@/types';
import { useJourneyStore } from '@/store/useJourneyStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Lock, Play, Star, Users as UsersIcon, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function JourneyMap() {
  const { journeys, selectedJourneyId, selectJourney, completeActivity } = useJourneyStore();
  const journey = journeys.find(j => j.id === selectedJourneyId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<JourneyNode | null>(null);

  // No longer fetching a single journey, but relying on selectedJourneyId
  // useEffect(() => {
  //   fetchJourney();
  // }, [fetchJourney]);

  if (!journey) return <div className="p-10 text-center text-slate-500">Selecciona un viaje para comenzar.</div>;

  // Helper to find node by ID for connection drawing
  const getNodeById = (id: string) => journey.nodes.find(n => n.id === id);

  return (
    <div className="relative w-full h-[600px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-inner" ref={containerRef}>
      
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <Button variant="ghost" className="gap-2 text-slate-600 hover:text-slate-900" onClick={() => selectJourney(null)}>
            <ChevronLeft size={16} /> Volver a mis viajes
        </Button>
      </div>

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-5" 
           style={{ backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>

      {/* SVG Layer for Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {journey.nodes.map(node => (
          <React.Fragment key={node.id}>
            {node.connections.map(targetId => {
              const target = getNodeById(targetId);
              if (!target) return null;
              
              // const isPathActive = node.status === 'completed' || node.status === 'in-progress'; // Removed for simpler lines

              return (
                <line 
                  key={`${node.id}-${targetId}`}
                  x1={`${node.x}%`} y1={`${node.y}%`}
                  x2={`${target.x}%`} y2={`${target.y}%`}
                  stroke="#cbd5e1" 
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              );
            })}
          </React.Fragment>
        ))}
      </svg>

      {/* Nodes Layer */}
      {journey.nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: node.status === 'locked' ? 0.5 : 1,
            filter: node.status === 'locked' ? 'grayscale(100%)' : 'grayscale(0%)'
          }}
          transition={{ 
            duration: 0.5, 
            type: 'spring',
            filter: { duration: 1 } // Slower transition for color "desvanecimiento" effect
          }}
        >
          <NodeButton node={node} onClick={() => node.status !== 'locked' && setSelectedNode(node)} />
          {/* Label */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none">
            <span className={cn(
              "text-xs font-semibold px-2 py-1 rounded bg-white/80 backdrop-blur-sm shadow-sm transition-colors duration-500",
              node.status === 'locked' ? 'text-slate-400' : 'text-slate-700'
            )}>
              {node.title}
            </span>
          </div>
        </motion.div>
      ))}

      {/* Detail Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <DialogContent className={cn("sm:max-w-md", selectedNode?.type === 'typeform' && "sm:max-w-2xl")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-teal-800">
              {selectedNode?.title}
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 pt-2">
              {selectedNode?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
             {selectedNode?.type === 'typeform' ? (
                <div className="w-full h-[400px] rounded-lg overflow-hidden border border-slate-200">
                   <iframe 
                     src={selectedNode.externalUrl || "https://form.typeform.com/to/example"} 
                     width="100%" 
                     height="100%" 
                     frameBorder="0"
                     title="Typeform"
                   ></iframe>
                </div>
             ) : (
                 /* Mock Content based on type */
                 <>
                     <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-center h-32 border border-slate-100 border-dashed">
                        {selectedNode?.type === 'video' && <Play className="h-10 w-10 text-teal-400 opacity-50" />}
                        {selectedNode?.type === 'quiz' && <span className="text-4xl">?</span>}
                        {selectedNode?.type === 'workshop' && <UsersIcon className="h-10 w-10 text-amber-400 opacity-50" />}
                        {selectedNode?.type === 'challenge' && <Star className="h-10 w-10 text-yellow-500 opacity-50" />}
                    </div>
                     <p className="text-sm text-slate-500 mt-4 text-center italic">
                        {selectedNode?.status === 'completed' 
                        ? "¡Ya completaste esta actividad!" 
                        : selectedNode?.status === 'locked' 
                            ? "Completa las actividades anteriores para desbloquear esta."
                            : "Esta actividad está lista para comenzar."}
                    </p>
                 </>
             )}
          </div>

          <DialogFooter className="sm:justify-center">
            {selectedNode?.status === 'in-progress' || selectedNode?.status === 'available' ? (
              <Button 
                onClick={async () => {
                   if (selectedNode) await completeActivity(selectedNode.id);
                   setSelectedNode(null);
                }}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white"
              >
                Completar Actividad
              </Button>
            ) : selectedNode?.status === 'completed' ? (
               <Button variant="outline" className="w-full sm:w-auto border-teal-200 text-teal-700 bg-teal-50">
                  <Check className="mr-2 h-4 w-4" /> Completado
               </Button>
            ) : (
                <Button disabled variant="secondary" className="w-full sm:w-auto bg-slate-100 text-slate-400">
                    <Lock className="mr-2 h-4 w-4" /> Bloqueado
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NodeButton({ node, onClick }: { node: JourneyNode; onClick: () => void }) {
  const statusColors = {
    completed: "bg-teal-500 text-white shadow-teal-200",
    "in-progress": "bg-amber-400 text-amber-900 shadow-amber-200 animate-pulse-slow",
    available: "bg-white text-teal-600 border-2 border-teal-500",
    locked: "bg-slate-200 text-slate-400",
  };

  const Icon = node.status === 'completed' ? Check : node.status === 'locked' ? Lock : node.type === 'challenge' ? Star : Play;

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors z-20",
        statusColors[node.status] || statusColors.locked
      )}
    >
      <Icon size={20} fill={node.status === 'completed' ? 'none' : 'currentColor'} className={node.status === 'completed' ? '' : 'opacity-80'} />
    </motion.button>
  );
}


