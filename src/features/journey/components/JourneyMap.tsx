'use client';

import React, { useRef, useState } from 'react';
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
import { Check, Lock, Play, Star, Users as UsersIcon, ChevronLeft, FileDown, Presentation, Gamepad2, ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

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

  const getEmbedSrc = (node: JourneyNode) => node.embedUrl || node.externalUrl || node.videoUrl;

  const renderNodeContent = (node: JourneyNode) => {
    const embedSrc = getEmbedSrc(node);

    switch (node.type) {
      case 'video':
        return embedSrc ? (
          <div className="w-full rounded-lg overflow-hidden border border-slate-200">
            <iframe src={embedSrc} className="w-full aspect-video" frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen title={node.title} />
          </div>
        ) : (
          <DefaultPlaceholder node={node} icon={<Play className="h-10 w-10 text-brand opacity-50" />} />
        );

      case 'typeform':
        return embedSrc ? (
          <div className="w-full h-[400px] rounded-lg overflow-hidden border border-slate-200">
            <iframe src={embedSrc} width="100%" height="100%" frameBorder="0"
              allow="camera; microphone; autoplay; encrypted-media" title="Typeform" />
          </div>
        ) : (
          <DefaultPlaceholder node={node} icon={<FileText className="h-10 w-10 text-brand opacity-50" />} />
        );

      case 'pdf':
        return embedSrc ? (
          <div className="w-full h-[500px] rounded-lg overflow-hidden border border-slate-200">
            <iframe src={embedSrc} width="100%" height="100%" frameBorder="0"
              allowFullScreen title="PDF" />
          </div>
        ) : (
          <DefaultPlaceholder node={node} icon={<FileDown className="h-10 w-10 text-brand opacity-50" />} />
        );

      case 'presentation':
        return embedSrc ? (
          <div className="w-full rounded-lg overflow-hidden border border-slate-200">
            <iframe src={embedSrc} className="w-full aspect-video" frameBorder="0"
              allowFullScreen title="Presentación" />
          </div>
        ) : (
          <DefaultPlaceholder node={node} icon={<Presentation className="h-10 w-10 text-brand opacity-50" />} />
        );

      case 'kahoot':
        return (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="flex flex-col items-center gap-4 pt-6">
              <Gamepad2 className="h-12 w-12 text-purple-500" />
              <p className="text-sm text-purple-700 text-center">
                Este quiz interactivo se abre en una nueva pestaña.
              </p>
              {embedSrc && (
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <a href={embedSrc} target="_blank" rel="noopener noreferrer">
                    Abrir Kahoot <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        );

      default:
        return (
          <DefaultPlaceholder
            node={node}
            icon={
              node.type === 'quiz' ? <span className="text-4xl">?</span> :
              node.type === 'workshop' ? <UsersIcon className="h-10 w-10 text-amber-400 opacity-50" /> :
              node.type === 'challenge' ? <Star className="h-10 w-10 text-yellow-500 opacity-50" /> :
              <Play className="h-10 w-10 text-brand opacity-50" />
            }
          />
        );
    }
  };

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
        <DialogContent className={cn(
          "sm:max-w-md",
          selectedNode?.type && ['typeform', 'video', 'pdf', 'presentation'].includes(selectedNode.type) && "sm:max-w-2xl"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-brand">
              {selectedNode?.title}
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 pt-2">
              {selectedNode?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
             {selectedNode && renderNodeContent(selectedNode)}
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
               <Button variant="outline" className="w-full sm:w-auto border-brand/20 text-brand bg-brand/5">
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

function DefaultPlaceholder({ node, icon }: { node: JourneyNode; icon: React.ReactNode }) {
  return (
    <>
      <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-center h-32 border border-slate-100 border-dashed">
        {icon}
      </div>
      <p className="text-sm text-slate-500 mt-4 text-center italic">
        {node.status === 'completed'
          ? "¡Ya completaste esta actividad!"
          : node.status === 'locked'
            ? "Completa las actividades anteriores para desbloquear esta."
            : "Esta actividad está lista para comenzar."}
      </p>
    </>
  );
}

const getNodeIcon = (node: JourneyNode) => {
  if (node.status === 'completed') return Check;
  if (node.status === 'locked') return Lock;
  switch (node.type) {
    case 'challenge': return Star;
    case 'pdf': return FileDown;
    case 'presentation': return Presentation;
    case 'kahoot': return Gamepad2;
    case 'typeform': return FileText;
    default: return Play;
  }
};

function NodeButton({ node, onClick }: { node: JourneyNode; onClick: () => void }) {
  const statusColors = {
    completed: "bg-brand text-white shadow-brand/20",
    "in-progress": "bg-amber-400 text-amber-900 shadow-amber-200 animate-pulse-slow",
    available: "bg-white text-brand border-2 border-brand",
    locked: "bg-slate-200 text-slate-400",
  };

  const IconComponent = getNodeIcon(node);

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
      {React.createElement(IconComponent, {
        size: 20,
        fill: node.status === 'completed' ? 'none' : 'currentColor',
        className: node.status === 'completed' ? '' : 'opacity-80'
      })}
    </motion.button>
  );
}


