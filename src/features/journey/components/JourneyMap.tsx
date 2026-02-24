'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JourneyNode } from '@/types';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import {
  Check,
  Lock,
  Play,
  Star,
  Users as UsersIcon,
  ChevronLeft,
  FileDown,
  Presentation,
  Gamepad2,
  ExternalLink,
  FileText,
  X,
  UserCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Widget as TypeformWidget } from '@typeform/embed-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ENCOURAGEMENT_MESSAGES = [
  '¡Excelente!',
  '¡Increíble!',
  '¡Sigue así!',
  '¡Lo lograste!',
  '¡Genial!',
  '¡Asombroso!',
];

export function JourneyMap() {
  const { user } = useAuthStore();
  const { journeys, selectedJourneyId, selectJourney, completeActivity, enrollmentMap } = useJourneyStore();
  const journey = journeys.find(j => j.id === selectedJourneyId);

  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [typeformSubmitted, setTypeformSubmitted] = useState(false);
  const [profileAnswer, setProfileAnswer] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const pathRef = useRef<HTMLDivElement>(null);

  // Celebration state
  const [celebration, setCelebration] = useState<{ message: string; points: number } | null>(null);

  // Auto-scroll to active step
  useEffect(() => {
    if (!activeStepId || !journey) return;
    const el = document.getElementById(`step-${activeStepId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeStepId, journey]);

  if (!journey) {
    return <div className="p-10 text-center text-slate-500">Selecciona un viaje para comenzar.</div>;
  }

  const sortedNodes = [...journey.nodes].sort((a, b) => {
    const ai = journey.nodes.indexOf(a);
    const bi = journey.nodes.indexOf(b);
    return ai - bi;
  });

  const completedCount = sortedNodes.filter(n => n.status === 'completed').length;
  const totalCount = sortedNodes.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const activeNode = sortedNodes.find(n => n.id === activeStepId);

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

  const getEmbedSrc = (node: JourneyNode) => {
    return node.embedUrl || node.externalUrl || node.videoUrl || undefined;
  };

  const handleCompleteActivity = async (node: JourneyNode, externalRef?: string) => {
    setIsCompleting(true);
    try {
      // For profile_question, pass the answer as metadata
      if (node.type === 'profile_question' && profileAnswer) {
        await completeActivity(node.id, undefined, { answer: profileAnswer });
      } else {
        await completeActivity(node.id, externalRef);
      }

      const points = node.points || 10;
      const msg = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
      setCelebration({ message: msg, points });

      setTimeout(() => {
        setCelebration(null);
        setActiveStepId(null);
        setTypeformSubmitted(false);
        setProfileAnswer('');
      }, 1800);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleOpenStep = (node: JourneyNode) => {
    if (node.status === 'locked') return;
    setActiveStepId(node.id);
    setTypeformSubmitted(false);
    setProfileAnswer('');
  };

  // ───── ACTIVE STEP VIEW (Full-screen immersive) ─────
  if (activeNode) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Top Bar */}
        <div className="flex-shrink-0 px-4 py-3 flex items-center gap-4 border-b border-slate-100">
          <button
            onClick={() => { setActiveStepId(null); setTypeformSubmitted(false); setProfileAnswer(''); }}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
          {/* Mini progress bar */}
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-500">{completedCount}/{totalCount}</span>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col">
            {/* Step header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <p className="text-sm font-medium text-teal-600 mb-1">
                Paso {sortedNodes.indexOf(activeNode) + 1} de {totalCount}
              </p>
              <h2 className="text-2xl font-bold text-slate-900">{activeNode.title}</h2>
              {activeNode.description && activeNode.description !== activeNode.title && (
                <p className="text-slate-500 mt-2">{activeNode.description}</p>
              )}
            </motion.div>

            {/* Step content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 flex flex-col"
            >
              {renderImmersiveContent(activeNode)}
            </motion.div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-slate-100 bg-white">
          <div className="max-w-2xl mx-auto">
            {renderImmersiveCTA(activeNode)}
          </div>
        </div>

        {/* Celebration Overlay */}
        <AnimatePresence>
          {celebration && (
            <motion.div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="flex flex-col items-center gap-4"
                initial={{ scale: 0.5, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 1.1, opacity: 0 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                <motion.div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-2xl"
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Check className="h-12 w-12 text-white" strokeWidth={3} />
                </motion.div>
                <motion.p
                  className="text-3xl font-bold text-white drop-shadow-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {celebration.message}
                </motion.p>
                <motion.div
                  className="flex items-center gap-2 bg-white/90 backdrop-blur rounded-full px-5 py-2 shadow-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span className="text-lg font-bold text-slate-800">+{celebration.points} XP</span>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ───── HELPER: Render content inside active step ─────
  function renderImmersiveContent(node: JourneyNode) {
    const embedSrc = getEmbedSrc(node);

    switch (node.type) {
      case 'video':
        return embedSrc ? (
          <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            <iframe
              src={embedSrc}
              className="w-full aspect-video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={node.title}
            />
          </div>
        ) : (
          <EmptyState icon={<Play className="h-12 w-12 text-teal-400" />} text="Contenido no disponible" />
        );

      case 'typeform': {
        const formId = getTypeformId(node);
        return formId ? (
          <div className="w-full flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm min-h-[400px]">
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
          <EmptyState icon={<FileText className="h-12 w-12 text-teal-400" />} text="Formulario no disponible" />
        );
      }

      case 'pdf':
        return embedSrc ? (
          <div className="w-full flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm min-h-[500px]">
            <iframe src={embedSrc} width="100%" height="100%" style={{ minHeight: '500px' }} frameBorder="0" allowFullScreen title="PDF" />
          </div>
        ) : (
          <EmptyState icon={<FileDown className="h-12 w-12 text-teal-400" />} text="Documento no disponible" />
        );

      case 'presentation':
        return embedSrc ? (
          <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            <iframe src={embedSrc} className="w-full aspect-video" frameBorder="0" allowFullScreen title="Presentación" />
          </div>
        ) : (
          <EmptyState icon={<Presentation className="h-12 w-12 text-teal-400" />} text="Presentación no disponible" />
        );

      case 'kahoot':
        return (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
              <Gamepad2 className="h-10 w-10 text-purple-600" />
            </div>
            <p className="text-lg text-slate-600 text-center max-w-sm">
              Este quiz interactivo se abre en una nueva pestaña. ¡Diviértete!
            </p>
            {embedSrc && (
              <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700 text-lg px-8">
                <a href={embedSrc} target="_blank" rel="noopener noreferrer">
                  Abrir Kahoot <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
            )}
          </div>
        );

      case 'profile_question':
        return (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-20 h-20 rounded-full bg-fuchsia-100 flex items-center justify-center">
              <UserCircle className="h-10 w-10 text-fuchsia-600" />
            </div>
            <p className="text-lg text-slate-600 text-center max-w-sm">
              {node.profileFieldLabel || node.title}
            </p>
            <div className="w-full max-w-sm">
              {node.profileFieldType === 'select' && node.profileFieldOptions ? (
                <Select value={profileAnswer} onValueChange={setProfileAnswer}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Selecciona una opción..." />
                  </SelectTrigger>
                  <SelectContent>
                    {node.profileFieldOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : node.profileFieldType === 'date' ? (
                <Input
                  type="date"
                  value={profileAnswer}
                  onChange={(e) => setProfileAnswer(e.target.value)}
                  className="h-12 text-base text-center"
                />
              ) : (
                <Input
                  type="text"
                  value={profileAnswer}
                  onChange={(e) => setProfileAnswer(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  className="h-12 text-base text-center"
                />
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
              {node.type === 'workshop' ? <UsersIcon className="h-10 w-10 text-amber-500" /> :
               node.type === 'challenge' ? <Star className="h-10 w-10 text-yellow-500" /> :
               <Play className="h-10 w-10 text-teal-400" />}
            </div>
            <p className="text-lg text-slate-500 text-center italic">
              {node.status === 'completed'
                ? '¡Ya completaste esta actividad!'
                : 'Esta actividad está lista para comenzar.'}
            </p>
          </div>
        );
    }
  }

  // ───── HELPER: Render CTA button inside active step ─────
  function renderImmersiveCTA(node: JourneyNode) {
    if (node.status === 'completed') {
      return (
        <Button variant="outline" className="w-full h-14 text-base border-teal-200 text-teal-600 bg-teal-50" disabled>
          <Check className="mr-2 h-5 w-5" /> Completado
        </Button>
      );
    }

    if (node.type === 'typeform') {
      return typeformSubmitted ? (
        <Button
          variant="outline"
          className="w-full h-14 text-base border-teal-200 text-teal-600 bg-teal-50"
          onClick={() => { setActiveStepId(null); setTypeformSubmitted(false); }}
        >
          <Check className="mr-2 h-5 w-5" /> Formulario enviado
        </Button>
      ) : (
        <Button disabled className="w-full h-14 text-base bg-slate-100 text-slate-400">
          Completa el formulario para continuar
        </Button>
      );
    }

    if (node.type === 'profile_question') {
      return (
        <Button
          onClick={() => handleCompleteActivity(node)}
          disabled={!profileAnswer.trim() || isCompleting}
          className="w-full h-14 text-base bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-lg shadow-teal-200/50 disabled:opacity-50"
        >
          {isCompleting ? 'Guardando...' : 'Continuar'}
          {!isCompleting && <ChevronRight className="ml-2 h-5 w-5" />}
        </Button>
      );
    }

    return (
      <Button
        onClick={() => handleCompleteActivity(node)}
        disabled={isCompleting}
        className="w-full h-14 text-base bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-lg shadow-teal-200/50"
      >
        {isCompleting ? 'Completando...' : 'Completar Actividad'}
        {!isCompleting && <ChevronRight className="ml-2 h-5 w-5" />}
      </Button>
    );
  }

  // ───── PATH VIEW (Duolingo-style vertical path) ─────
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => selectJourney(null)}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-slate-500" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">{journey.title}</h1>
          </div>
          <div className="flex items-center gap-2 bg-teal-50 px-3 py-1.5 rounded-full">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-bold text-teal-700">{progressPercent}%</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Vertical Path */}
      <div className="flex-1 overflow-y-auto px-4 pb-8" ref={pathRef}>
        <div className="max-w-md mx-auto relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />

          {sortedNodes.map((node, index) => {
            const isCompleted = node.status === 'completed';
            const isAvailable = node.status === 'available' || node.status === 'in-progress';
            const isLocked = node.status === 'locked';
            const isNext = !isCompleted && isAvailable;

            return (
              <motion.div
                key={node.id}
                id={`step-${node.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
                className="relative flex items-start gap-4 mb-2"
              >
                {/* Node circle */}
                <button
                  onClick={() => handleOpenStep(node)}
                  disabled={isLocked}
                  className="relative z-10 flex-shrink-0"
                >
                  <motion.div
                    className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-all',
                      isCompleted && 'bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-teal-200',
                      isNext && 'bg-white border-[3px] border-teal-500 text-teal-600 shadow-teal-100',
                      isAvailable && !isNext && 'bg-white border-2 border-teal-300 text-teal-500',
                      isLocked && 'bg-slate-100 text-slate-300 shadow-none'
                    )}
                    whileHover={!isLocked ? { scale: 1.1 } : undefined}
                    whileTap={!isLocked ? { scale: 0.95 } : undefined}
                    animate={isNext ? { boxShadow: ['0 0 0 0 rgba(20,184,166,0)', '0 0 0 8px rgba(20,184,166,0.2)', '0 0 0 0 rgba(20,184,166,0)'] } : undefined}
                    transition={isNext ? { duration: 2, repeat: Infinity } : undefined}
                  >
                    {getNodeIcon(node)}
                  </motion.div>
                  {/* Step number badge */}
                  <div className={cn(
                    'absolute -top-1 -right-1 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center',
                    isCompleted ? 'bg-teal-600 text-white' : isAvailable ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-400'
                  )}>
                    {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                  </div>
                </button>

                {/* Content card */}
                <button
                  onClick={() => handleOpenStep(node)}
                  disabled={isLocked}
                  className={cn(
                    'flex-1 text-left rounded-2xl p-4 transition-all min-h-[72px] flex flex-col justify-center',
                    isCompleted && 'bg-teal-50/80 border border-teal-100',
                    isNext && 'bg-white border-2 border-teal-200 shadow-md shadow-teal-50',
                    isAvailable && !isNext && 'bg-white border border-slate-200 shadow-sm',
                    isLocked && 'bg-slate-50 border border-slate-100 opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'font-semibold truncate',
                        isCompleted ? 'text-teal-700' : isLocked ? 'text-slate-400' : 'text-slate-800'
                      )}>
                        {node.title}
                      </p>
                      <p className={cn(
                        'text-sm mt-0.5',
                        isCompleted ? 'text-teal-500' : isLocked ? 'text-slate-300' : 'text-slate-500'
                      )}>
                        {getNodeTypeLabel(node.type)}
                        {node.points ? ` · ${node.points} XP` : ''}
                      </p>
                    </div>
                    {!isLocked && (
                      <ChevronRight className={cn(
                        'h-5 w-5 flex-shrink-0 ml-2',
                        isCompleted ? 'text-teal-400' : 'text-slate-400'
                      )} />
                    )}
                    {isLocked && (
                      <Lock className="h-4 w-4 text-slate-300 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}

          {/* Journey completion indicator */}
          {progressPercent === 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex items-center gap-4 mt-4"
            >
              <div className="relative z-10 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-200">
                  <Star className="h-8 w-8 text-white" fill="white" />
                </div>
              </div>
              <div className="flex-1 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="font-bold text-amber-800">¡Journey completado!</p>
                <p className="text-sm text-amber-600">Has completado todos los pasos. ¡Felicidades!</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {celebration && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ scale: 0.5, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <motion.div
                className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-2xl"
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Check className="h-12 w-12 text-white" strokeWidth={3} />
              </motion.div>
              <motion.p
                className="text-3xl font-bold text-white drop-shadow-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {celebration.message}
              </motion.p>
              <motion.div
                className="flex items-center gap-2 bg-white/90 backdrop-blur rounded-full px-5 py-2 shadow-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span className="text-lg font-bold text-slate-800">+{celebration.points} XP</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">{icon}</div>
      <p className="text-slate-400">{text}</p>
    </div>
  );
}

function getNodeIcon(node: JourneyNode) {
  if (node.status === 'completed') return <Check className="h-7 w-7" strokeWidth={3} />;
  if (node.status === 'locked') return <Lock className="h-6 w-6" />;

  const iconClass = "h-7 w-7";
  switch (node.type) {
    case 'video': return <Play className={iconClass} />;
    case 'typeform': return <FileText className={iconClass} />;
    case 'pdf': return <FileDown className={iconClass} />;
    case 'presentation': return <Presentation className={iconClass} />;
    case 'kahoot': return <Gamepad2 className={iconClass} />;
    case 'workshop': return <UsersIcon className={iconClass} />;
    case 'challenge': return <Star className={iconClass} />;
    case 'article': return <FileText className={iconClass} />;
    case 'profile_question': return <UserCircle className={iconClass} />;
    default: return <Play className={iconClass} />;
  }
}

function getNodeTypeLabel(type: string) {
  const labels: Record<string, string> = {
    video: 'Video',
    typeform: 'Encuesta',
    pdf: 'Documento',
    presentation: 'Presentación',
    kahoot: 'Quiz interactivo',
    workshop: 'Taller',
    challenge: 'Desafío',
    article: 'Recurso',
    feedback: 'Feedback',
    quiz: 'Quiz',
    profile_question: 'Pregunta de perfil',
  };
  return labels[type] || 'Actividad';
}
