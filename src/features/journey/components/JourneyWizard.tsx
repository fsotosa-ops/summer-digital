'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { Journey, JourneyNode, NodeStatus } from '@/types';
import { ApiCrmContact, ApiFieldOption } from '@/types/api.types';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { crmService } from '@/services/crm.service';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Check,
  Lock,
  ChevronRight,
  Zap,
  User,
  Loader2,
  Phone,
  Building2,
  Calendar,
  UserCircle,
  GraduationCap,
  Briefcase,
  Globe,
  MapPin,
  Video,
  FileText,
  Trophy,
} from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Field labels & questions ────────────────────────────────────
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

const FIELD_QUESTIONS: Record<string, string> = {
  phone: '¿Cuál es tu número de teléfono?',
  company: '¿En qué empresa trabajas?',
  birth_date: '¿Cuándo naciste?',
  gender: '¿Cómo te identificas?',
  education_level: '¿Cuál es tu nivel educativo?',
  occupation: '¿Cuál es tu ocupación?',
  country: '¿De qué país eres?',
  state: '¿En qué estado/provincia estás?',
  city: '¿En qué ciudad vives?',
};

const FIELD_ICONS: Record<string, React.ElementType> = {
  phone: Phone,
  company: Building2,
  birth_date: Calendar,
  gender: UserCircle,
  education_level: GraduationCap,
  occupation: Briefcase,
  country: Globe,
  state: MapPin,
  city: MapPin,
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  phone: 'Ej: +56 9 1234 5678',
  company: 'Ej: Mi Empresa S.A.',
};

// Fields rendered as pill buttons (no dropdown)
const SELECT_FIELDS = new Set(['gender', 'education_level', 'occupation']);

// Hardcoded presets — used when the backend has no options configured
const FIELD_PRESETS: Record<string, { value: string; label: string }[]> = {
  gender: [
    { value: 'masculino', label: 'Masculino' },
    { value: 'femenino', label: 'Femenino' },
    { value: 'no_binario', label: 'No binario' },
    { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
  ],
  education_level: [
    { value: 'secundaria', label: 'Secundaria' },
    { value: 'tecnico', label: 'Técnico / Tecnólogo' },
    { value: 'universitario', label: 'Universitario' },
    { value: 'postgrado', label: 'Posgrado' },
  ],
  occupation: [
    { value: 'estudiante', label: 'Estudiante' },
    { value: 'empleado', label: 'Empleado' },
    { value: 'independiente', label: 'Independiente' },
    { value: 'empresario', label: 'Empresario' },
    { value: 'jubilado', label: 'Jubilado' },
    { value: 'desempleado', label: 'Desempleado' },
  ],
};

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
  const { selectJourney, fetchJourneys, completeActivity } = useJourneyStore();
  const storeJourneys = useJourneyStore(s => s.journeys);

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

  // UI state
  const [fieldIndex, setFieldIndex] = useState(0);
  const [xpPop, setXpPop] = useState<{ visible: boolean; amount: number }>({ visible: false, amount: 0 });
  const [showCelebration, setShowCelebration] = useState(false);
  const [showStepSuccess, setShowStepSuccess] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isPreviewMode) selectJourney(initialJourney.id);
  }, [isPreviewMode, initialJourney.id, selectJourney]);

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

  const currentNode = nodes.find(n => n.status === 'available')
    ?? nodes.find(n => n.status === 'locked')
    ?? null;

  useEffect(() => {
    setFieldIndex(0);
  }, [currentNode?.id]);

  useEffect(() => {
    if (!currentNode) return;
    const fields = currentNode.fieldNames || [];
    const initial: Partial<ApiCrmContact> = {};
    for (const f of fields) {
      (initial as Record<string, unknown>)[f] = (contact as Record<string, unknown>)[f] ?? '';
    }
    setDraft(initial);
  }, [currentNode?.id, contact]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Location memos ────────────────────────────────────────
  const currentCountry = ((draft as Record<string, unknown>).country as string) || '';
  const currentState = ((draft as Record<string, unknown>).state as string) || '';

  const countryOptions = useMemo(
    () => [
      { value: NONE, label: 'Sin país' },
      ...Country.getAllCountries().map(c => ({ value: c.isoCode, label: `${c.flag} ${c.name}` })),
    ],
    [],
  );

  const stateOptions = useMemo(
    () => (currentCountry ? State.getStatesOfCountry(currentCountry) : []),
    [currentCountry],
  );

  const cityOptions = useMemo(
    () => (currentCountry && currentState ? City.getCitiesOfState(currentCountry, currentState) : []),
    [currentCountry, currentState],
  );

  // Searchable option lists for state and city (same shape as countryOptions)
  const stateSelectOptions = useMemo(
    () => [
      { value: NONE, label: 'Sin región' },
      ...stateOptions.map(s => ({ value: s.isoCode, label: s.name })),
    ],
    [stateOptions],
  );

  const citySelectOptions = useMemo(
    () => [
      { value: NONE, label: 'Sin ciudad' },
      ...cityOptions.map(c => ({ value: c.name, label: c.name })),
    ],
    [cityOptions],
  );

  // ─── Draft helpers ─────────────────────────────────────────
  const handleDraftChange = (field: string, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const isFieldFilled = useCallback((fieldName: string): boolean => {
    const val = (draft as Record<string, unknown>)[fieldName];
    return !!(val && (typeof val !== 'string' || val.trim() !== ''));
  }, [draft]);

  const handleNextField = () => {
    const fields = currentNode?.fieldNames || [];
    if (fieldIndex < fields.length - 1) {
      setFieldIndex(prev => prev + 1);
    }
  };

  // ─── Shared completion helpers ──────────────────────────────
  const showXp = (amount: number) => {
    setXpPop({ visible: true, amount });
    setTimeout(() => setXpPop({ visible: false, amount: 0 }), 1600);
  };

  const triggerStepSuccess = () => {
    setShowStepSuccess(true);
    setTimeout(() => setShowStepSuccess(false), 600);
  };

  const checkJourneyComplete = () => {
    const updated = useJourneyStore.getState().journeys.find(j => j.id === initialJourney.id);
    if (updated?.progress === 100) {
      setTimeout(() => setShowCelebration(true), 800);
    }
  };

  const simCompleteNode = (node: JourneyNode) => {
    const nodeIndex = journey.nodes.findIndex(n => n.id === node.id);
    const updatedNodes = journey.nodes.map((n, idx) => {
      if (n.id === node.id) return { ...n, status: 'completed' as NodeStatus };
      if (idx === nodeIndex + 1 && n.status === 'locked') return { ...n, status: 'available' as NodeStatus };
      return n;
    });
    const cCount = updatedNodes.filter(n => n.status === 'completed').length;
    const newProgress = Math.round((cCount / updatedNodes.length) * 100);
    setSimJourney({ ...journey, nodes: updatedNodes, progress: newProgress });
    showXp(node.points ?? 10);
    if (newProgress === 100) setTimeout(() => setShowCelebration(true), 800);
  };

  // ─── Completion handlers ────────────────────────────────────
  const handleCompleteStep = async () => {
    if (!currentNode || isSaving) return;
    setIsSaving(true);
    try {
      if (isPreviewMode) { simCompleteNode(currentNode); return; }

      const fieldsToSave = { ...draft };
      for (const key of Object.keys(fieldsToSave)) {
        const val = (fieldsToSave as Record<string, unknown>)[key];
        if (val === '' || val === NONE) delete (fieldsToSave as Record<string, unknown>)[key];
      }
      const saved = await crmService.updateMyContact(fieldsToSave);
      setContact(saved);
      triggerStepSuccess();
      await fetchJourneys(user?.organizationId ?? undefined);
      showXp(currentNode.points ?? 10);
      checkJourneyComplete();
    } catch (err) {
      console.error('[JourneyWizard] error completing step:', err);
      toast.error('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Used by pill auto-advance on the last field — passes value explicitly to avoid stale closure
  const handleCompletePillSelect = async (lastField: string, lastValue: string) => {
    if (!currentNode || isSaving) return;
    setIsSaving(true);
    try {
      if (isPreviewMode) { simCompleteNode(currentNode); return; }

      const fieldsToSave: Record<string, unknown> = { ...draft, [lastField]: lastValue };
      for (const key of Object.keys(fieldsToSave)) {
        const val = fieldsToSave[key];
        if (val === '' || val === NONE) delete fieldsToSave[key];
      }
      const saved = await crmService.updateMyContact(fieldsToSave as Partial<ApiCrmContact>);
      setContact(saved);
      triggerStepSuccess();
      await fetchJourneys(user?.organizationId ?? undefined);
      showXp(currentNode.points ?? 10);
      checkJourneyComplete();
    } catch (err) {
      console.error('[JourneyWizard] error completing step:', err);
      toast.error('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteMilestoneStep = async (node: JourneyNode) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (isPreviewMode) { simCompleteNode(node); return; }
      triggerStepSuccess();
      await completeActivity(node.id);
      showXp(node.points ?? 10);
      checkJourneyComplete();
    } catch (err) {
      console.error('[JourneyWizard] error completing milestone:', err);
      toast.error('Error al completar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Pill select handler (auto-advances after 350ms) ────────
  const handlePillSelect = (fieldName: string, value: string) => {
    handleDraftChange(fieldName, value);
    const fields = currentNode?.fieldNames || [];
    const isLast = fieldIndex === fields.length - 1;
    if (isLast) {
      setTimeout(() => handleCompletePillSelect(fieldName, value), 350);
    } else {
      setTimeout(() => setFieldIndex(prev => prev + 1), 350);
    }
  };

  // ─── Pill renderer ──────────────────────────────────────────
  const renderPillSelect = (fieldName: string, opts: { value: string; label: string }[]) => {
    const currentValue = ((draft as Record<string, unknown>)[fieldName] as string) || '';
    return (
      <div className="flex flex-wrap gap-2 justify-center pt-1">
        {opts.map(opt => (
          <button
            key={opt.value}
            onClick={() => handlePillSelect(fieldName, opt.value)}
            className={cn(
              'px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150',
              currentValue === opt.value
                ? 'border-sky-500 bg-sky-50 text-sky-700 scale-[1.03] shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50/60'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  };

  // ─── Single field renderer ──────────────────────────────────
  const renderSingleField = (fieldName: string) => {
    const value = ((draft as Record<string, unknown>)[fieldName] as string) || '';

    if (fieldName === 'country') {
      return (
        <SearchableSelect
          options={countryOptions}
          value={value || NONE}
          onValueChange={v => {
            handleDraftChange('country', v === NONE ? '' : v);
            handleDraftChange('state', '');
            handleDraftChange('city', '');
          }}
          placeholder="Selecciona tu país"
          searchPlaceholder="Buscar país..."
          emptyMessage="País no encontrado."
          className="h-14"
          popoverContentClassName="z-[200]"
        />
      );
    }

    if (fieldName === 'state') {
      return (
        <SearchableSelect
          options={stateSelectOptions}
          value={value || NONE}
          onValueChange={v => {
            handleDraftChange('state', v === NONE ? '' : v);
            handleDraftChange('city', '');
          }}
          placeholder={currentCountry ? 'Selecciona tu región' : 'Elige un país primero'}
          searchPlaceholder="Buscar región..."
          emptyMessage="Región no encontrada."
          disabled={!currentCountry}
          popoverContentClassName="z-[200]"
        />
      );
    }

    if (fieldName === 'city') {
      return (
        <SearchableSelect
          options={citySelectOptions}
          value={value || NONE}
          onValueChange={v => handleDraftChange('city', v === NONE ? '' : v)}
          placeholder={currentState ? 'Selecciona tu ciudad' : 'Elige una región primero'}
          searchPlaceholder="Buscar ciudad..."
          emptyMessage="Ciudad no encontrada."
          disabled={!currentState}
          popoverContentClassName="z-[200]"
        />
      );
    }

    if (SELECT_FIELDS.has(fieldName)) {
      const serverOpts = fieldOptions[fieldName] || [];
      const opts = serverOpts.length > 0
        ? serverOpts.map(o => ({ value: o.value, label: o.label }))
        : (FIELD_PRESETS[fieldName] || []);
      return renderPillSelect(fieldName, opts);
    }

    if (fieldName === 'birth_date') {
      return (
        <Input
          type="date"
          value={value}
          onChange={e => handleDraftChange(fieldName, e.target.value)}
          className="h-14 text-base border-slate-200 focus:border-sky-400 focus-visible:ring-sky-400/20"
        />
      );
    }

    return (
      <Input
        type={fieldName === 'phone' ? 'tel' : 'text'}
        value={value}
        placeholder={FIELD_PLACEHOLDERS[fieldName] || ''}
        onChange={e => handleDraftChange(fieldName, e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && isFieldFilled(fieldName)) {
            const fields = currentNode?.fieldNames || [];
            if (fieldIndex < fields.length - 1) handleNextField();
            else handleCompleteStep();
          }
        }}
        className="h-14 text-base border-slate-200 focus:border-sky-400 focus-visible:ring-sky-400/20"
      />
    );
  };

  // ─── Milestone step (non-profile / no-field nodes) ──────────
  const renderMilestoneStep = (node: JourneyNode) => {
    const embedSrc = node.embedUrl || node.videoUrl || node.externalUrl;

    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center mx-auto mb-3">
            {node.type === 'video'
              ? <Video className="h-10 w-10 text-white" />
              : <FileText className="h-10 w-10 text-white" />
            }
          </div>
          <div className="h-1 w-12 bg-gradient-to-r from-sky-400 to-teal-400 rounded-full mx-auto mt-2 mb-6" />
          <h2 className="text-2xl font-bold text-slate-800">{node.title}</h2>
          {node.description && (
            <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">{node.description}</p>
          )}
        </div>

        {embedSrc && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <div className="aspect-video w-full">
              <iframe
                src={embedSrc}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
              />
            </div>
          </div>
        )}

        {node.status === 'locked' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-slate-400">
            <Lock className="h-8 w-8" />
            <p className="text-sm">Completa el paso anterior para desbloquear.</p>
          </div>
        ) : (
          <button
            onClick={() => handleCompleteMilestoneStep(node)}
            disabled={isSaving}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all',
              !isSaving
                ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md hover:shadow-lg hover:scale-[1.02]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            {isSaving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
              : <>Listo <ChevronRight className="h-4 w-4" /></>
            }
          </button>
        )}

        {node.points && (
          <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
            <Zap className="h-3 w-3 text-amber-400" />
            +{node.points} XP al completar
          </p>
        )}
      </motion.div>
    );
  };

  // ─── Profile step (field-by-field) ──────────────────────────
  const renderProfileStep = (node: JourneyNode) => {
    const fields = node.fieldNames || [];
    if (fields.length === 0) return renderMilestoneStep(node);

    const currentField = fields[fieldIndex];
    const isLastField = fieldIndex === fields.length - 1;
    const fieldFilled = isFieldFilled(currentField);
    const isPillField = SELECT_FIELDS.has(currentField);
    const FieldIcon = FIELD_ICONS[currentField];
    const question = FIELD_QUESTIONS[currentField] || FIELD_LABELS[currentField] || currentField;

    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-lg"
      >
        {/* Step context badge */}
        <div className="text-center mb-5">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center mx-auto mb-2">
            <User className="h-6 w-6 text-white" />
          </div>
          <p className="text-xs font-semibold text-sky-500 uppercase tracking-wider">{node.title}</p>
          {node.description && fieldIndex === 0 && (
            <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">{node.description}</p>
          )}
        </div>

        {/* Field card — animated per field */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${node.id}-f${fieldIndex}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4"
          >
            {node.status === 'locked' ? (
              <div className="flex flex-col items-center gap-3 py-6 text-slate-400">
                <Lock className="h-8 w-8" />
                <p className="text-sm">Completa el paso anterior para desbloquear.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {FieldIcon && (
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-2xl bg-sky-50 flex items-center justify-center">
                      <FieldIcon className="h-8 w-8 text-sky-500" />
                    </div>
                  </div>
                )}
                <p className="text-center text-xl font-semibold text-slate-800 leading-tight">{question}</p>
                {renderSingleField(currentField)}
                <p className="text-center text-xs text-slate-400">
                  Campo {fieldIndex + 1} de {fields.length}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* CTA — hidden for pill fields (they auto-advance on click) */}
        {node.status === 'available' && !isPillField && (
          <button
            onClick={isLastField ? handleCompleteStep : handleNextField}
            disabled={!fieldFilled || (isLastField && isSaving)}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all',
              fieldFilled && !(isLastField && isSaving)
                ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md hover:shadow-lg hover:scale-[1.02]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            {isLastField && isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
            ) : isLastField ? (
              <>Listo con este paso <ChevronRight className="h-4 w-4" /></>
            ) : (
              <>Siguiente <ChevronRight className="h-4 w-4" /></>
            )}
          </button>
        )}

        {node.points && (
          <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
            <Zap className="h-3 w-3 text-amber-400" />
            +{node.points} XP al completar
          </p>
        )}
      </motion.div>
    );
  };

  // ─── Loading ────────────────────────────────────────────────
  if (isFetchingContact) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    );
  }

  // ─── Celebration screen ─────────────────────────────────────
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
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Trophy className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Perfil Completo</h1>
          <p className="text-slate-500 mb-6">
            Ganaste <span className="font-bold text-sky-600">+{xpTotal} XP</span> por completar tu onboarding.
          </p>
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Continuar
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Wizard layout ──────────────────────────────────────────
  const isComplete = progressPct === 100;

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-sky-50 via-white to-teal-50 flex flex-col">
      {/* Step success overlay */}
      <AnimatePresence>
        {showStepSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[150] bg-teal-500/20 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="h-24 w-24 rounded-full bg-teal-500 flex items-center justify-center shadow-xl"
            >
              <Check className="h-12 w-12 text-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-sm border-b border-slate-100 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
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

        {/* Progress dots */}
        <div className="flex gap-1.5 items-center">
          {nodes.map(node => (
            <div
              key={node.id}
              className={cn(
                'h-2.5 rounded-full transition-all duration-300',
                node.status === 'completed'
                  ? 'w-2.5 bg-teal-500'
                  : node.status === 'available'
                  ? 'w-8 bg-sky-500'
                  : 'w-2.5 bg-slate-200'
              )}
            />
          ))}
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 flex-shrink-0">
        <motion.div
          className="h-full bg-gradient-to-r from-sky-500 to-teal-500"
          animate={{ width: `${progressPct}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        />
      </div>

      {/* XP pop */}
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

      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-4 py-8">
        {isComplete ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg text-center"
          >
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Todo listo</h2>
            <p className="text-slate-500 mb-6">Tu perfil está completo.</p>
            <button
              onClick={onBack}
              className="bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold px-8 py-3 rounded-xl"
            >
              Ir al inicio
            </button>
          </motion.div>
        ) : currentNode ? (
          <AnimatePresence mode="wait">
            {(currentNode.fieldNames && currentNode.fieldNames.length > 0)
              ? renderProfileStep(currentNode)
              : renderMilestoneStep(currentNode)
            }
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}