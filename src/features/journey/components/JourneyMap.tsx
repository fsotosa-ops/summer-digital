'use client';

import React, { useState, useEffect } from 'react';
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
import { Check, Lock, Play, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function JourneyMap() {
  const { journey, fetchJourney, completeActivity } = useJourneyStore();
  const [selectedNode, setSelectedNode] = useState<JourneyNode | null>(null);

  useEffect(() => {
    fetchJourney();
  }, [fetchJourney]);

  if (!journey) return <div className="p-10 text-center text-slate-400">Cargando mapa...</div>;

  // Helper to find node by ID for connection drawing
  const getNodeById = (id: string) => journey.nodes.find(n => n.id === id);

  return (
    <div className="relative w-full h-[600px] bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 shadow-inner">
      {/* SVG Layer for Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {journey.nodes.map(node => (
          <React.Fragment key={node.id}>
            {node.connections.map(targetId => {
              const target = getNodeById(targetId);
              if (!target) return null;
              
              const isPathActive = node.status === 'completed' || node.status === 'in-progress';

              return (
                <motion.line
                  key={`${node.id}-${targetId}`}
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${target.x}%`}
                  y2={`${target.y}%`}
                  stroke={isPathActive ? "#0d9488" : "#e2e8f0"} // Teal-600 vs Slate-200
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
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
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        >
          <NodeButton node={node} onClick={() => setSelectedNode(node)} />
          {/* Label */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none">
            <span className={cn(
              "text-xs font-semibold px-2 py-1 rounded bg-white/80 backdrop-blur-sm shadow-sm",
              node.status === 'locked' ? 'text-slate-400' : 'text-slate-700'
            )}>
              {node.title}
            </span>
          </div>
        </motion.div>
      ))}

      {/* Detail Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-teal-800">
              {selectedNode?.title}
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 pt-2">
              {selectedNode?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
             {/* Mock Content based on type */}
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

// Simple Icon component for the placeholder
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
