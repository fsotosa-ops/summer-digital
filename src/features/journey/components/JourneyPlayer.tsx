'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { Journey, JourneyNode, NodeStatus } from '@/types';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Widget as TypeformWidget } from '@typeform/embed-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Check,
  Lock,
  Play,
  Star,
  Users as UsersIcon,
  FileDown,
  Presentation,
  Gamepad2,
  ExternalLink,
  FileText,
  RotateCcw,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface JourneyPlayerProps {
  journey: Journey;
  isPreviewMode?: boolean;
  onBack: () => void;
}

export function JourneyPlayer({
  journey: initialJourney,
  isPreviewMode = false,
  onBack,
}: JourneyPlayerProps) {
  const { user } = useAuthStore();
  const { completeActivity, selectJourney, enrollmentMap } = useJourneyStore();
  const storeJourneys = useJourneyStore(s => s.journeys);

  // Real mode: track journey from store; preview mode: local sim state
  const liveJourney = isPreviewMode
    ? null
    : storeJourneys.find(j => j.id === initialJourney.id) ?? initialJourney;

  const [simJourney, setSimJourney] = useState<Journey>(initialJourney);
  const journey = isPreviewMode ? simJourney : liveJourney!;

  const [viewMode, setViewMode] = useState<'path' | 'content'>('path');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [xpPop, setXpPop] = useState<{ visible: boolean; amount: number }>({ visible: false, amount: 0 });
  const [showCelebration, setShowCelebration] = useState(false);
  const [typeformSubmitted, setTypeformSubmitted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set selectedJourneyId in the store so completeActivity works
  useEffect(() => {
    if (!isPreviewMode) {
      selectJourney(initialJourney.id);
    }
  }, [isPreviewMode, initialJourney.id, selectJourney]);

  const selectedNode = journey.nodes.find(n => n.id === selectedNodeId) ?? null;
  const xpEarned = journey.nodes
    .filter(n => n.status === 'completed')
    .reduce((sum, n) => sum + (n.points || 0), 0);
  const completedCount = journey.nodes.filter(n => n.status === 'completed').length;
  const totalCount = journey.nodes.length;
  const currentNodeIndex = selectedNode
    ? journey.nodes.findIndex(n => n.id === selectedNodeId)
    : -1;

  // ─── Helpers ──────────────────────────────────────────────────
  const getTypeformId = (node: JourneyNode): string | null => {
    const url = node.embedUrl || node.externalUrl;
    if (!url) return null;
    const match = url.match(/typeform\.com\/to\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

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

  const getEmbedSrc = (node: JourneyNode) =>
    node.embedUrl || node.externalUrl || node.videoUrl || undefined;

  const getNodeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      video: 'Video',
      typeform: 'Formulario',
      pdf: 'PDF',
      presentation: 'Presentación',
      kahoot: 'Kahoot',
      workshop: 'Taller',
      challenge: 'Desafío',
      article: 'Artículo',
      quiz: 'Quiz',
      feedback: 'Feedback',
    };
    return labels[type] || type;
  };

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

  const handleOpenNode = (node: JourneyNode) => {
    if (node.status === 'locked') return;
    setSelectedNodeId(node.id);
    setViewMode('content');
    setTypeformSubmitted(false);
  };

  // ─── Core completion logic ─────────────────────────────────────
  const triggerCompletion = async (node: JourneyNode, responseId?: string) => {
    const points = node.points || 10;

    if (isPreviewMode) {
      const nodeIndex = journey.nodes.findIndex(n => n.id === node.id);
      if (nodeIndex === -1) return;

      const updatedNodes = journey.nodes.map((n, idx) => {
        if (n.id === node.id) return { ...n, status: 'completed' as NodeStatus };
        if (idx === nodeIndex + 1 && n.status === 'locked')
          return { ...n, status: 'available' as NodeStatus };
        return n;
      });
      const completedCnt = updatedNodes.filter(n => n.status === 'completed').length;
      const newProgress = Math.round((completedCnt / updatedNodes.length) * 100);
      const newStatus = newProgress === 100 ? ('completed' as const) : journey.status;
      setSimJourney({ ...journey, nodes: updatedNodes, progress: newProgress, status: newStatus });

      setXpPop({ visible: true, amount: points });
      setTimeout(() => setXpPop({ visible: false, amount: 0 }), 1600);

      setTimeout(() => {
        setViewMode('path');
        setSelectedNodeId(null);
        setTypeformSubmitted(false);
        if (newProgress === 100) setShowCelebration(true);
      }, 800);
    } else {
      await completeActivity(node.id, responseId);

      setXpPop({ visible: true, amount: points });
      setTimeout(() => setXpPop({ visible: false, amount: 0 }), 1600);

      const updatedJourney = useJourneyStore
        .getState()
        .journeys.find(j => j.id === initialJourney.id);

      setTimeout(() => {
        setViewMode('path');
        setSelectedNodeId(null);
        setTypeformSubmitted(false);
        if (updatedJourney?.progress === 100) setShowCelebration(true);
      }, 800);
    }
  };

  // ─── Node content renderer ─────────────────────────────────────
  const renderNodeContent = (node: JourneyNode) => {
    const embedSrc = getEmbedSrc(node);

    switch (node.type) {
      case 'video':
        return embedSrc ? (
          <div className="w-full h-full">
            <iframe
              src={embedSrc}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={node.title}
            />
          </div>
        ) : (
          <DefaultPlaceholder node={node} icon={<Play className="h-10 w-10 text-sky-400 opacity-50" />} />
        );

      case 'typeform': {
        const formId = getTypeformId(node);
        return formId ? (
          <div className="w-full h-full">
            <TypeformWidget
              id={formId}
              style={{ width: '100%', height: '100%' }}
              hidden={isPreviewMode ? {} : getTypeformHiddenFields(node)}
              onSubmit={async (data) => {
                setTypeformSubmitted(true);
                await triggerCompletion(node, isPreviewMode ? undefined : data.responseId);
              }}
            />
          </div>
        ) : (
          <DefaultPlaceholder
            node={node}
            icon={<FileText className="h-10 w-10 text-sky-400 opacity-50" />}
          />
        );
      }

      case 'pdf':
        return embedSrc ? (
          <div className="w-full h-full">
            <iframe
              src={embedSrc}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              title="PDF"
            />
          </div>
        ) : (
          <DefaultPlaceholder
            node={node}
            icon={<FileDown className="h-10 w-10 text-sky-400 opacity-50" />}
          />
        );

      case 'presentation':
        return embedSrc ? (
          <div className="w-full h-full">
            <iframe
              src={embedSrc}
              className="w-full h-full"
              frameBorder="0"
              allowFullScreen
              title="Presentación"
            />
          </div>
        ) : (
          <DefaultPlaceholder
            node={node}
            icon={<Presentation className="h-10 w-10 text-sky-400 opacity-50" />}
          />
        );

      case 'kahoot':
        return (
          <div className="flex items-center justify-center h-full">
            <Card className="border-purple-200 bg-purple-50 max-w-sm w-full mx-4">
              <CardContent className="flex flex-col items-center gap-4 pt-6 pb-6">
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
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full px-4">
            <DefaultPlaceholder
              node={node}
              icon={
                node.type === 'quiz' ? (
                  <span className="text-4xl">?</span>
                ) : node.type === 'workshop' ? (
                  <UsersIcon className="h-10 w-10 text-amber-400 opacity-50" />
                ) : node.type === 'challenge' ? (
                  <Star className="h-10 w-10 text-yellow-500 opacity-50" />
                ) : (
                  <Play className="h-10 w-10 text-sky-400 opacity-50" />
                )
              }
            />
          </div>
        );
    }
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">

      {/* ── TopBar ─────────────────────────────────────────────── */}
      <div className="h-14 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium hidden sm:inline">Salir</span>
        </button>

        {isPreviewMode && (
          <span className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold
                           uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0">
            Vista Previa
          </span>
        )}

        <h1 className="flex-1 text-sm font-semibold text-slate-800 truncate min-w-0">
          {journey.title}
        </h1>

        {/* Progress bar (desktop) */}
        <div className="w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden flex-shrink-0 hidden sm:block">
          <motion.div
            className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${journey.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* XP counter */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Zap size={14} className="text-amber-500" />
          <span className="text-sm font-bold text-sky-600">{xpEarned}</span>
        </div>

        {/* Reset button — preview mode only */}
        {isPreviewMode && (
          <button
            onClick={() => {
              setSimJourney(initialJourney);
              setViewMode('path');
              setSelectedNodeId(null);
              setShowCelebration(false);
              setTypeformSubmitted(false);
            }}
            className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800
                       border border-purple-200 hover:bg-purple-50 px-2 py-1 rounded-lg
                       transition-colors flex-shrink-0"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
        )}
      </div>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">

        {/* PATH VIEW */}
        {viewMode === 'path' && (
          <div className="h-full overflow-y-auto py-8 px-4">
            <div className="max-w-lg mx-auto w-full">

              {/* Journey header */}
              <div className="mb-8 text-center space-y-2">
                {journey.thumbnail_url ? (
                  <div className="w-full h-32 rounded-2xl overflow-hidden mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={journey.thumbnail_url}
                      alt={journey.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-24 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 mb-4 flex items-center justify-center">
                    <span className="text-white text-4xl font-black opacity-30">
                      {journey.title[0]}
                    </span>
                  </div>
                )}
                <h2 className="text-xl font-black text-slate-800">{journey.title}</h2>
                <p className="text-sm text-slate-500">
                  {completedCount} de {totalCount} pasos
                </p>
                {/* Mobile progress bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden sm:hidden mx-auto max-w-xs">
                  <motion.div
                    className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${journey.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Step rows */}
              {journey.nodes.map((node, idx) => {
                const NodeIcon = getNodeIcon(node);
                const isCompleted = node.status === 'completed';
                const isAvailable = node.status === 'available' || node.status === 'in-progress';
                const isLocked = node.status === 'locked';

                return (
                  <div key={node.id} className="flex gap-4">
                    {/* Left column: circle + line */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300 }}
                        className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center shadow-md',
                          isCompleted && 'bg-gradient-to-br from-emerald-500 to-teal-500',
                          isAvailable && 'bg-gradient-to-br from-sky-500 to-teal-500 animate-pulse',
                          isLocked && 'bg-slate-200'
                        )}
                      >
                        <NodeIcon
                          size={20}
                          className={cn(
                            isCompleted && 'text-white',
                            isAvailable && 'text-white',
                            isLocked && 'text-slate-400'
                          )}
                        />
                      </motion.div>
                      {/* Connector line */}
                      {idx < journey.nodes.length - 1 && (
                        <div
                          className={cn(
                            'w-0.5 flex-grow my-1',
                            isCompleted ? 'bg-teal-300' : 'bg-slate-200'
                          )}
                          style={{ minHeight: '24px' }}
                        />
                      )}
                    </div>

                    {/* Right column: card */}
                    <div className="flex-1 mb-6">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 + 0.1 }}
                        className={cn(
                          'rounded-2xl p-4 border',
                          isCompleted && 'bg-slate-50 border-teal-100',
                          isAvailable && 'bg-white border-sky-200 shadow-sm',
                          isLocked && 'bg-slate-50/60 border-slate-100 opacity-60'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <span
                              className={cn(
                                'text-[10px] font-bold uppercase tracking-widest',
                                isCompleted && 'text-teal-500',
                                isAvailable && 'text-sky-500',
                                isLocked && 'text-slate-400'
                              )}
                            >
                              {getNodeTypeLabel(node.type)}
                            </span>
                            <h3
                              className={cn(
                                'font-bold text-sm mt-0.5',
                                isCompleted && 'text-slate-500 line-through decoration-slate-300',
                                isAvailable && 'text-slate-800',
                                isLocked && 'text-slate-400'
                              )}
                            >
                              {node.title}
                            </h3>
                          </div>
                          {isCompleted && node.points && (
                            <span className="text-[11px] font-semibold text-slate-400 flex-shrink-0">
                              +{node.points} xp
                            </span>
                          )}
                          {isAvailable && (
                            <span className="bg-sky-50 text-sky-600 border border-sky-100 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                              Disponible
                            </span>
                          )}
                        </div>

                        {isAvailable && node.description && (
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                            {node.description}
                          </p>
                        )}

                        {isAvailable && (
                          <button
                            onClick={() => handleOpenNode(node)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                                       bg-gradient-to-r from-sky-500 to-teal-500 text-white
                                       text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
                          >
                            ¡Empezar! <ChevronRight size={16} />
                          </button>
                        )}

                        {isCompleted && (
                          <button
                            onClick={() => handleOpenNode(node)}
                            className="text-xs text-slate-400 hover:text-teal-600 transition-colors mt-1"
                          >
                            Ver contenido →
                          </button>
                        )}

                        {isLocked && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <Lock size={10} /> Completa el paso anterior
                          </p>
                        )}
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CONTENT VIEW */}
        {viewMode === 'content' && selectedNode && (
          <div className="h-full flex flex-col">
            {/* Mini topbar */}
            <div className="h-10 px-4 flex items-center gap-3 border-b bg-slate-50 flex-shrink-0">
              <button
                onClick={() => {
                  setViewMode('path');
                  setSelectedNodeId(null);
                  setTypeformSubmitted(false);
                }}
                className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors flex-shrink-0"
              >
                <ArrowLeft size={14} /> Volver al camino
              </button>
              <span className="text-slate-200">|</span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-sky-600 flex-shrink-0">
                {getNodeTypeLabel(selectedNode.type)}
              </span>
              <span className="text-sm font-medium text-slate-700 truncate flex-1 min-w-0">
                {selectedNode.title}
              </span>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden">
              {renderNodeContent(selectedNode)}
            </div>
          </div>
        )}

        {/* XP Pop animation */}
        <AnimatePresence>
          {xpPop.visible && (
            <motion.div
              key="xp-pop"
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -60, scale: 1.2 }}
              exit={{ opacity: 0, y: -100 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
            >
              <span className="text-3xl font-black text-amber-500 drop-shadow-lg">
                +{xpPop.amount} xp ⚡
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Celebration screen */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ReactConfetti
                width={windowSize.width}
                height={windowSize.height}
                recycle={false}
                numberOfPieces={500}
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="text-8xl select-none"
              >
                🎉
              </motion.div>
              <div className="text-center space-y-2 px-6">
                <h2 className="text-4xl font-black text-sky-700">
                  {isPreviewMode ? '¡Fin de la Simulación!' : '¡Journey Completada!'}
                </h2>
                {xpEarned > 0 && !isPreviewMode && (
                  <p className="text-xl font-bold text-amber-500">
                    +{xpEarned} XP ganados
                  </p>
                )}
              </div>
              <button
                onClick={
                  isPreviewMode
                    ? () => {
                        setSimJourney(initialJourney);
                        setViewMode('path');
                        setSelectedNodeId(null);
                        setShowCelebration(false);
                      }
                    : onBack
                }
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500
                           text-white font-bold text-lg shadow-lg hover:opacity-90 transition-opacity"
              >
                {isPreviewMode ? '↺ Reiniciar simulación' : 'Volver a Mis Journeys'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── BottomBar (content view only, non-typeform) ────────── */}
      {viewMode === 'content' && selectedNode && (
        <div
          className="h-20 border-t bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.05)]
                     flex items-center justify-between px-6 flex-shrink-0"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400">
              Paso {currentNodeIndex + 1} de {totalCount}
            </p>
            <p className="text-sm font-semibold text-slate-700 truncate">
              {selectedNode.title}
            </p>
          </div>

          {/* Typeform: show submitted state */}
          {selectedNode.type === 'typeform' && typeformSubmitted && (
            <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200
                            rounded-2xl text-teal-700 text-sm font-semibold flex-shrink-0 ml-4">
              <Check size={16} /> Formulario enviado
            </div>
          )}

          {/* Non-typeform: complete button */}
          {selectedNode.type !== 'typeform' && (
            <button
              onClick={() =>
                selectedNode.status !== 'completed' && triggerCompletion(selectedNode)
              }
              disabled={selectedNode.status === 'completed'}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-2xl font-bold shadow text-white',
                'text-sm flex-shrink-0 ml-4 transition-opacity',
                selectedNode.status === 'completed'
                  ? 'bg-teal-500 opacity-70 cursor-default'
                  : 'bg-gradient-to-r from-sky-500 to-teal-500 hover:opacity-90'
              )}
            >
              {selectedNode.status === 'completed' ? (
                <>
                  <Check size={16} /> Completado
                </>
              ) : isPreviewMode ? (
                <>Simular completación →</>
              ) : (
                <>¡Lo completé! →</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DefaultPlaceholder({
  node,
  icon,
}: {
  node: JourneyNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
      <div className="bg-slate-50 p-6 rounded-2xl flex items-center justify-center border border-slate-100 border-dashed">
        {icon}
      </div>
      <p className="text-sm text-slate-500 text-center italic max-w-sm">
        {node.status === 'completed'
          ? '¡Ya completaste esta actividad!'
          : node.status === 'locked'
          ? 'Completa las actividades anteriores para desbloquear esta.'
          : 'Esta actividad está lista para comenzar.'}
      </p>
    </div>
  );
}
