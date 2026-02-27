'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { Journey, JourneyNode, NodeStatus } from '@/types';
import { ApiCrmContact, ApiFieldOption } from '@/types/api.types';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { crmService } from '@/services/crm.service';
import { LocationSelector } from '@/features/crm/components/LocationSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Check,
  Lock,
  ChevronRight,
  Zap,
  User,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Field configuration ────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  phone: 'Teléfono',
  company: 'Empresa',
  birth_date: 'Fecha de nacimiento',
  gender: 'Género',
  education_level: 'Nivel educativo',
  occupation: 'Ocupación',
  country: 'País',
  state: 'Estado / Provincia',
  city: 'Ciudad',
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  phone: 'Ej: +56 9 1234 5678',
  company: 'Ej: Mi Empresa S.A.',
  birth_date: '',
};

// Fields rendered with a Select (fed by field_options from CRM)
const SELECT_FIELDS = new Set(['gender', 'education_level', 'occupation']);

// Location group: handled as a unit by LocationSelector
const LOCATION_FIELDS = new Set(['country', 'state', 'city']);

const NONE = '__none__';

// ─── Types ──────────────────────────────────────────────────────
interface JourneyWizardProps {
  journey: Journey;
  isPreviewMode?: boolean;
  onBack: () => void;
}

// ─── Component ──────────────────────────────────────────────────
export function JourneyWizard({
  journey: initialJourney,
  isPreviewMode = false,
  onBack,
}: JourneyWizardProps) {
  const { user } = useAuthStore();
  const { selectJourney, fetchJourneys } = useJourneyStore();
  const storeJourneys = useJourneyStore(s => s.journeys);

  // Real mode: track live from store; preview mode: local sim
  const liveJourney = isPreviewMode
    ? null
    : storeJourneys.find(j => j.id === initialJourney.id) ?? initialJourney;
  const [simJourney, setSimJourney] = useState<Journey>(initialJourney);
  const journey = isPreviewMode ? simJourney : liveJourney!;

  const [contact, setContact] = useState<Partial<ApiCrmContact>>({});
  const [fieldOptions, setFieldOptions] = useState<Record<string, ApiFieldOption[]>>({});
  const [isFetchingContact, setIsFetchingContact] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<ApiCrmContact>>({});
  const [xpPop, setXpPop] = useState<{ visible: boolean; amount: number }>({ visible: false, amount: 0 });
  const [showCelebration, setShowCelebration] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Register in store for completeActivity
  useEffect(() => {
    if (!isPreviewMode) selectJourney(initialJourney.id);
  }, [isPreviewMode, initialJourney.id, selectJourney]);

  // Load contact + field options
  useEffect(() => {
    if (isPreviewMode) {
      setIsFetchingContact(false);
      return;
    }
    Promise.all([
      crmService.getMyContact().catch(() => null),
      crmService.listFieldOptions().catch(() => [] as ApiFieldOption[]),
    ]).then(([c, opts]) => {
      if (c) setContact(c);
      const grouped: Record<string, ApiFieldOption[]> = {};
      (opts || []).forEach(o => {
        if (!grouped[o.field_name]) grouped[o.field_name] = [];
        grouped[o.field_name].push(o);
      });
      setFieldOptions(grouped);
    }).finally(() => setIsFetchingContact(false));
  }, [isPreviewMode]);

  // ─── Derived state ─────────────────────────────────────────
  const nodes = journey.nodes;
  const completedCount = nodes.filter(n => n.status === 'completed').length;
  const totalCount = nodes.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Current active step: first available, or first locked if none available
  const currentNode = nodes.find(n => n.status === 'available')
    ?? nodes.find(n => n.status === 'locked')
    ?? null;

  // ─── Step completion / draft logic ────────────────────────
  // When current node changes, reset draft to existing contact values
  useEffect(() => {
    if (!currentNode) return;
    const fields = currentNode.fieldNames || [];
    const initial: Partial<ApiCrmContact> = {};
    for (const f of fields) {
      (initial as Record<string, unknown>)[f] = (contact as Record<string, unknown>)[f] ?? '';
    }
    setDraft(initial);
  }, [currentNode?.id, contact]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasLocationField = (fields: string[]) =>
    fields.some(f => LOCATION_FIELDS.has(f));

  const isDraftComplete = useCallback((): boolean => {
    if (!currentNode) return false;
    const fields = currentNode.fieldNames || [];
    for (const f of fields) {
      const val = (draft as Record<string, unknown>)[f];
      if (!val || (typeof val === 'string' && val.trim() === '')) return false;
    }
    return true;
  }, [currentNode, draft]);

  // ─── Completion handler ────────────────────────────────────
  const handleCompleteStep = async () => {
    if (!currentNode || isSaving) return;
    setIsSaving(true);

    try {
      if (isPreviewMode) {
        // Simulate completion locally
        const nodeIndex = journey.nodes.findIndex(n => n.id === currentNode.id);
        const updatedNodes = journey.nodes.map((n, idx) => {
          if (n.id === currentNode.id) return { ...n, status: 'completed' as NodeStatus };
          if (idx === nodeIndex + 1 && n.status === 'locked') return { ...n, status: 'available' as NodeStatus };
          return n;
        });
        const cCount = updatedNodes.filter(n => n.status === 'completed').length;
        const newProgress = Math.round((cCount / updatedNodes.length) * 100);
        setSimJourney({ ...journey, nodes: updatedNodes, progress: newProgress });
        setXpPop({ visible: true, amount: currentNode.points || 25 });
        setTimeout(() => setXpPop({ visible: false, amount: 0 }), 1600);
        if (newProgress === 100) setTimeout(() => setShowCelebration(true), 800);
        return;
      }

      // 1. Save the draft fields to CRM.
      //    The backend's _try_complete_profile_field_steps() auto-completes matching steps.
      const fieldsToSave = { ...draft };
      // Strip empty strings → don't overwrite with empty
      for (const key of Object.keys(fieldsToSave)) {
        const val = (fieldsToSave as Record<string, unknown>)[key];
        if (val === '' || val === NONE) {
          delete (fieldsToSave as Record<string, unknown>)[key];
        }
      }

      const saved = await crmService.updateMyContact(fieldsToSave);
      setContact(saved);

      // 2. Re-fetch journeys to get fresh step statuses from the backend
      //    (backend auto-completed the step, so local store needs refresh)
      await fetchJourneys(user?.organizationId ?? undefined);

      // 3. XP pop
      setXpPop({ visible: true, amount: currentNode.points || 25 });
      setTimeout(() => setXpPop({ visible: false, amount: 0 }), 1600);

      // 4. Check if journey is now complete
      const updatedJourney = useJourneyStore.getState().journeys.find(j => j.id === initialJourney.id);
      if (updatedJourney?.progress === 100) {
        setTimeout(() => setShowCelebration(true), 800);
      }
    } catch (err) {
      console.error('[JourneyWizard] error completing step:', err);
      toast.error('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Field renderers ───────────────────────────────────────
  const handleDraftChange = (field: string, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (loc: { country: string; state: string; city: string }) => {
    setDraft(prev => ({ ...prev, country: loc.country, state: loc.state, city: loc.city }));
  };

  const renderField = (fieldName: string) => {
    const label = FIELD_LABELS[fieldName] || fieldName;
    const value = ((draft as Record<string, unknown>)[fieldName] as string) || '';

    if (SELECT_FIELDS.has(fieldName)) {
      const opts = fieldOptions[fieldName] || [];
      return (
        <div key={fieldName} className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">{label}</Label>
          <Select value={value || NONE} onValueChange={v => handleDraftChange(fieldName, v === NONE ? '' : v)}>
            <SelectTrigger className="h-11 border-slate-200 focus:border-sky-400 focus:ring-sky-400/20">
              <SelectValue placeholder={`Selecciona ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE} className="text-slate-400">Selecciona una opción</SelectItem>
              {opts.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
              {opts.length === 0 && (
                <SelectItem value="__no_opts__" disabled>Sin opciones configuradas</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (fieldName === 'birth_date') {
      return (
        <div key={fieldName} className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">{label}</Label>
          <Input
            type="date"
            value={value}
            onChange={e => handleDraftChange(fieldName, e.target.value)}
            className="h-11 border-slate-200 focus:border-sky-400 focus-visible:ring-sky-400/20"
          />
        </div>
      );
    }

    return (
      <div key={fieldName} className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">{label}</Label>
        <Input
          type={fieldName === 'phone' ? 'tel' : 'text'}
          value={value}
          placeholder={FIELD_PLACEHOLDERS[fieldName] || ''}
          onChange={e => handleDraftChange(fieldName, e.target.value)}
          className="h-11 border-slate-200 focus:border-sky-400 focus-visible:ring-sky-400/20"
        />
      </div>
    );
  };

  const renderCurrentStepFields = (node: JourneyNode) => {
    const fields = node.fieldNames || [];
    if (fields.length === 0) {
      return <p className="text-slate-400 text-sm">Sin campos configurados para este paso.</p>;
    }

    const nonLocationFields = fields.filter(f => !LOCATION_FIELDS.has(f));
    const hasLoc = hasLocationField(fields);
    const locFields = fields.filter(f => LOCATION_FIELDS.has(f));

    return (
      <div className="space-y-4">
        {nonLocationFields.map(renderField)}
        {hasLoc && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Ubicación</Label>
            <LocationSelector
              value={{
                country: ((draft as Record<string, unknown>).country as string) || '',
                state: ((draft as Record<string, unknown>).state as string) || '',
                city: ((draft as Record<string, unknown>).city as string) || '',
              }}
              onChange={loc => {
                const partial: Partial<ApiCrmContact> = {};
                if (locFields.includes('country')) (partial as Record<string, unknown>).country = loc.country;
                if (locFields.includes('state')) (partial as Record<string, unknown>).state = loc.state;
                if (locFields.includes('city')) (partial as Record<string, unknown>).city = loc.city;
                setDraft(prev => ({ ...prev, ...partial }));
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // ─── Loading state ─────────────────────────────────────────
  if (isFetchingContact) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    );
  }

  // ─── Celebration screen ────────────────────────────────────
  if (showCelebration) {
    const xpTotal = nodes.reduce((sum, n) => sum + (n.points || 0), 0);
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-sky-50 to-teal-50 flex flex-col items-center justify-center">
        <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={300} />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-center px-8 max-w-sm"
        >
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">¡Perfil Completo!</h1>
          <p className="text-slate-500 mb-6">Ganaste <span className="font-bold text-sky-600">+{xpTotal} XP</span> por completar tu onboarding.</p>
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Continuar →
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Wizard layout ─────────────────────────────────────────
  const isComplete = progressPct === 100;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-100 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Bienvenida</p>
          <h1 className="text-sm font-semibold text-slate-800 truncate">{journey.title}</h1>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{completedCount}</span>
          <span>/</span>
          <span>{totalCount}</span>
        </div>
      </header>

      {/* ── Progress bar ── */}
      <div className="h-1.5 bg-slate-100 flex-shrink-0">
        <motion.div
          className="h-full bg-gradient-to-r from-sky-500 to-teal-500"
          animate={{ width: `${progressPct}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        />
      </div>

      {/* ── XP pop ── */}
      <AnimatePresence>
        {xpPop.visible && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute top-20 right-4 z-[110] flex items-center gap-1.5 bg-amber-400 text-amber-900 font-bold text-sm px-3 py-1.5 rounded-full shadow-lg"
          >
            <Zap className="h-4 w-4" />
            +{xpPop.amount} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-4 py-8">
        {/* Step list (top pills) */}
        <div className="flex gap-2 mb-8 flex-wrap justify-center">
          {nodes.map((node, idx) => (
            <div
              key={node.id}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                node.status === 'completed'
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : node.status === 'available'
                  ? 'bg-sky-50 border-sky-300 text-sky-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              )}
            >
              {node.status === 'completed' ? (
                <Check className="h-3 w-3" />
              ) : node.status === 'locked' ? (
                <Lock className="h-3 w-3" />
              ) : (
                <span className="h-3 w-3 rounded-full bg-sky-400 inline-block" />
              )}
              <span>{node.stepIcon ? `${node.stepIcon} ` : ''}{node.title}</span>
            </div>
          ))}
        </div>

        {/* Current step card */}
        {isComplete ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg text-center"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Todo listo!</h2>
            <p className="text-slate-500 mb-6">Tu perfil está completo.</p>
            <button
              onClick={onBack}
              className="bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold px-8 py-3 rounded-xl"
            >
              Ir al inicio →
            </button>
          </motion.div>
        ) : currentNode ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentNode.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-lg"
            >
              {/* Step header */}
              <div className="text-center mb-6">
                {currentNode.stepIcon && (
                  <div className="text-5xl mb-3">{currentNode.stepIcon}</div>
                )}
                {!currentNode.stepIcon && (
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center mx-auto mb-3">
                    <User className="h-7 w-7 text-white" />
                  </div>
                )}
                <h2 className="text-xl font-bold text-slate-800">{currentNode.title}</h2>
                {currentNode.description && (
                  <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">{currentNode.description}</p>
                )}
              </div>

              {/* Form card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                {currentNode.status === 'locked' ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-slate-400">
                    <Lock className="h-8 w-8" />
                    <p className="text-sm">Completa el paso anterior para desbloquear.</p>
                  </div>
                ) : (
                  renderCurrentStepFields(currentNode)
                )}
              </div>

              {/* CTA */}
              {currentNode.status === 'available' && (
                <button
                  onClick={handleCompleteStep}
                  disabled={isSaving || !isDraftComplete()}
                  className={cn(
                    'w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all',
                    isDraftComplete() && !isSaving
                      ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md hover:shadow-lg'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                  ) : (
                    <>Continuar <ChevronRight className="h-4 w-4" /></>
                  )}
                </button>
              )}
              {currentNode.points && (
                <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
                  <Zap className="h-3 w-3 text-amber-400" />
                  +{currentNode.points} XP al completar
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
