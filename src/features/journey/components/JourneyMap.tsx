'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JourneyNode } from '@/types';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Check, Lock, Play, Star, Users as UsersIcon, ChevronLeft, FileDown, Presentation, Gamepad2, ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Widget as TypeformWidget } from '@typeform/embed-react';

const ENCOURAGEMENT_MESSAGES = [
  '¡Excelente! 🎉',
  '¡Increíble! ⭐',
  '¡Sigue así! 🔥',
  '¡Lo lograste! 💪',
];

export function JourneyMap() {
  const { user } = useAuthStore();
  const { journeys, selectedJourneyId, selectJourney, completeActivity, enrollmentMap } = useJourneyStore();

  const journey = journeys.find(j => j.id === selectedJourneyId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<JourneyNode | null>(null);
  const [typeformSubmitted, setTypeformSubmitted] = useState(false);

  // XP pop animation state
  const [xpPop, setXpPop] = useState<{ amount: number; visible: boolean }>({ amount: 0, visible: false });

  // Encouragement overlay state
  const [encouragement, setEncouragement] = useState<string | null>(null);

  if (!journey) return <div className="p-10 text-center text-slate-500">Selecciona un viaje para comenzar.</div>;

  // Helper to find node by ID for connection drawing
  const getNodeById = (id: string) => journey.nodes.find(n => n.id === id);

  // Extract Typeform form ID from URL
  const getTypeformId = (node: JourneyNode): string | null => {
    const url = node.embedUrl || node.externalUrl;
    if (!url) return null;
    const match = url.match(/typeform\.com\/to\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  // Build hidden fields object for Typeform SDK
  const getTypeformHiddenFields = (node: JourneyNode): Record<string, string> => {
    if (!user) return {};
    return {
      user_id: user.id,
      org_id: user.organizationId || '',
      journey_id: journey.id,
      step_id: node.id,
      enrollment_id: enrollmentMap.get(journey.id) || '',
    };
  };

  const getEmbedSrc = (node: JourneyNode) => {
    return node.embedUrl || node.externalUrl || node.videoUrl || undefined;
  };

  // Progressive reveal: show completed nodes + first available node
  // Locked future nodes render as faint silhouettes
  const firstAvailableId = journey.nodes.find(n => n.status === 'available')?.id;
  const visibleNodeIds = new Set(
    journey.nodes
      .filter(n => n.status === 'completed' || n.id === firstAvailableId)
      .map(n => n.id)
  );

  const handleCompleteActivity = async (node: JourneyNode) => {
    await completeActivity(node.id);
    setSelectedNode(null);
    setTypeformSubmitted(false);

    // Trigger XP pop animation
    const points = node.points ?? 10;
    setXpPop({ amount: points, visible: true });
    setTimeout(() => setXpPop({ amount: 0, visible: false }), 1600);

    // Trigger encouragement overlay
    const msg = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
    setEncouragement(msg);
    setTimeout(() => setEncouragement(null), 1500);
  };

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

      case 'typeform': {
        const formId = getTypeformId(node);
        return formId ? (
          <div className="w-full flex-1 rounded-lg overflow-hidden border border-slate-200 min-h-[400px]">
            <TypeformWidget
              id={formId}
              style={{ width: '100%', height: '100%', minHeight: '400px' }}
              hidden={getTypeformHiddenFields(node)}
              onSubmit={async (data) => {
                await completeActivity(node.id, data.responseId);
                setTypeformSubmitted(true);
              }}
            />
          </div>
        ) : (
          <DefaultPlaceholder node={node} icon={<FileText className="h-10 w-10 text-brand opacity-50" />} />
        );
      }

      case 'pdf':
        return embedSrc ? (
          <div className="w-full flex-1 rounded-lg overflow-hidden border border-slate-200 min-h-[500px]">
            <iframe src={embedSrc} width="100%" height="100%" style={{ minHeight: '500px' }} frameBorder="0"
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
          <Card className="border-summer-lavender bg-summer-lavender/10">
            <CardContent className="flex flex-col items-center gap-4 pt-6">
              <Gamepad2 className="h-12 w-12 text-summer-lavender" />
              <p className="text-sm text-summer-lavender text-center">
                Este quiz interactivo se abre en una nueva pestaña.
              </p>
              {embedSrc && (
                <Button asChild className="bg-summer-lavender hover:bg-summer-lavender">
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
              node.type === 'workshop' ? <UsersIcon className="h-10 w-10 text-summer-yellow opacity-50" /> :
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

      {/* SVG Layer for Connections — animated path color based on completion */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#14b8a6" />
          </marker>
        </defs>
        {journey.nodes.map(node => (
          <React.Fragment key={node.id}>
            {node.connections.map(targetId => {
              const target = getNodeById(targetId);
              if (!target) return null;
              const isCompleted = node.status === 'completed';
              const strokeColor = isCompleted ? '#14b8a6' : '#e2e8f0';

              return (
                <motion.line
                  key={`${node.id}-${targetId}`}
                  x1={`${node.x}%`} y1={`${node.y}%`}
                  x2={`${target.x}%`} y2={`${target.y}%`}
                  stroke={strokeColor}
                  strokeWidth={isCompleted ? 3 : 2}
                  strokeDasharray={isCompleted ? 'none' : '4 4'}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </svg>

      {/* Nodes Layer — progressive reveal */}
      {journey.nodes.map((node) => {
        const isVisible = visibleNodeIds.has(node.id);
        const isGhosted = !isVisible && node.status === 'locked';

        return (
          <motion.div
            key={node.id}
            className={cn(
              'absolute transform -translate-x-1/2 -translate-y-1/2 z-10',
              isGhosted && 'pointer-events-none'
            )}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: isGhosted ? 0.2 : node.status === 'locked' ? 0.5 : 1,
              filter: (isGhosted || node.status === 'locked') ? 'grayscale(100%)' : 'grayscale(0%)'
            }}
            transition={{
              duration: 0.5,
              type: 'spring',
              filter: { duration: 1 }
            }}
          >
            <NodeButton
              node={node}
              onClick={() => !isGhosted && node.status !== 'locked' && setSelectedNode(node)}
            />
            {/* Label — hide for ghosted nodes */}
            {!isGhosted && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none">
                <span className={cn(
                  "text-xs font-semibold px-2 py-1 rounded bg-white/80 backdrop-blur-sm shadow-sm transition-colors duration-500",
                  node.status === 'locked' ? 'text-slate-400' : 'text-slate-700'
                )}>
                  {node.title}
                </span>
              </div>
            )}
          </motion.div>
        );
      })}

      {/* XP Pop animation */}
      <AnimatePresence>
        {xpPop.visible && (
          <motion.div
            key="xp-pop"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-2xl font-bold text-summer-teal"
            initial={{ y: 0, opacity: 1, scale: 0.8 }}
            animate={{ y: -60, opacity: 0, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            +{xpPop.amount} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Encouragement Overlay */}
      <AnimatePresence>
        {encouragement && (
          <motion.div
            key="encouragement"
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl px-10 py-6 shadow-2xl border border-summer-teal">
              <p className="text-4xl font-bold text-center text-slate-800">{encouragement}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Sheet — full-height bottom drawer */}
      <Sheet open={!!selectedNode} onOpenChange={(open) => { if (!open) { setSelectedNode(null); setTypeformSubmitted(false); } }}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
            <SheetTitle className="flex items-center gap-2 text-xl text-brand">
              {selectedNode?.title}
            </SheetTitle>
            <SheetDescription className="text-base text-slate-600">
              {selectedNode?.description}
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selectedNode && renderNodeContent(selectedNode)}
          </div>

          {/* Fixed CTA at bottom */}
          <SheetFooter className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
            {selectedNode?.status === 'in-progress' || selectedNode?.status === 'available' ? (
              selectedNode?.type === 'typeform' ? (
                typeformSubmitted ? (
                  <Button
                    variant="outline"
                    className="w-full border-brand/20 text-brand bg-brand/5"
                    onClick={() => { setSelectedNode(null); setTypeformSubmitted(false); }}
                  >
                    <Check className="mr-2 h-4 w-4" /> Formulario enviado
                  </Button>
                ) : (
                  <Button disabled variant="secondary" className="w-full bg-slate-100 text-slate-500">
                    <FileText className="mr-2 h-4 w-4" /> Completa el formulario para continuar
                  </Button>
                )
              ) : (
                <Button
                  onClick={() => selectedNode && handleCompleteActivity(selectedNode)}
                  className="w-full bg-summer-teal hover:bg-summer-teal text-white text-base py-6"
                >
                  Completar Actividad
                </Button>
              )
            ) : selectedNode?.status === 'completed' ? (
              <Button variant="outline" className="w-full border-brand/20 text-brand bg-brand/5">
                <Check className="mr-2 h-4 w-4" /> Completado
              </Button>
            ) : (
              <Button disabled variant="secondary" className="w-full bg-slate-100 text-slate-400">
                <Lock className="mr-2 h-4 w-4" /> Bloqueado
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
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
    completed: "bg-summer-teal text-white shadow-summer-teal",
    "in-progress": "bg-summer-yellow text-summer-yellow shadow-summer-yellow animate-pulse-slow",
    available: "bg-white text-summer-teal border-2 border-summer-teal",
    locked: "bg-slate-200 text-slate-400",
  };

  const IconComponent = getNodeIcon(node);

  return (
    <motion.button
      whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
      whileTap={{ scale: 0.9 }}
      animate={node.status === 'in-progress' ? {
        scale: [1, 1.08, 1],
        boxShadow: [
          "0 0 0 0px rgba(251, 191, 36, 0.4)",
          "0 0 0 10px rgba(251, 191, 36, 0)",
          "0 0 0 0px rgba(251, 191, 36, 0)"
        ]
      } : {}}
      transition={node.status === 'in-progress' ? {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      } : {}}
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