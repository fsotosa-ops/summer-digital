'use client';

import { useState, useEffect } from 'react';
import { ApiJourneyEnrolleeRead } from '@/types/api.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

// ── Column definitions ──────────────────────────────────────────────────────

interface ColumnDef {
  key: string;
  label: string;
  required?: boolean;
}

interface ColumnGroup {
  label: string;
  columns: ColumnDef[];
}

const COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: 'Contacto',
    columns: [
      { key: 'full_name', label: 'Nombre completo', required: true },
      { key: 'email', label: 'Email', required: true },
      { key: 'first_name', label: 'Nombre' },
      { key: 'last_name', label: 'Apellido' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'company', label: 'Empresa' },
    ],
  },
  {
    label: 'Ubicación',
    columns: [
      { key: 'country', label: 'País' },
      { key: 'state', label: 'Región / Estado' },
      { key: 'city', label: 'Ciudad' },
    ],
  },
  {
    label: 'Demográficos',
    columns: [
      { key: 'birth_date', label: 'Fecha de nacimiento' },
      { key: 'gender', label: 'Género' },
      { key: 'education_level', label: 'Nivel educativo' },
      { key: 'occupation', label: 'Ocupación' },
    ],
  },
  {
    label: 'Progreso',
    columns: [
      { key: 'status', label: 'Estado', required: true },
      { key: 'progress_percentage', label: 'Progreso (%)', required: true },
      { key: 'current_step_index', label: 'Step actual' },
      { key: 'started_at', label: 'Inicio' },
      { key: 'completed_at', label: 'Completado' },
    ],
  },
];

const ALL_COLUMNS = COLUMN_GROUPS.flatMap((g) => g.columns);
const ALL_KEYS = ALL_COLUMNS.map((c) => c.key);
const REQUIRED_KEYS = ALL_COLUMNS.filter((c) => c.required).map((c) => c.key);

const LOCALSTORAGE_KEY = 'export-enrollees-columns';

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeCsvCell(val: string | number | null | undefined): string {
  const s = val == null ? '' : String(val);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function statusEsLabel(s: string): string {
  if (s === 'completed') return 'Completado';
  if (s === 'active') return 'En progreso';
  return 'No iniciado';
}

function dateOrEmpty(iso?: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '';
}

function getColumnValue(e: ApiJourneyEnrolleeRead, key: string): string {
  switch (key) {
    case 'full_name': return e.full_name ?? '';
    case 'email': return e.email ?? '';
    case 'first_name': return e.first_name ?? '';
    case 'last_name': return e.last_name ?? '';
    case 'phone': return e.phone ?? '';
    case 'company': return e.company ?? '';
    case 'country': return e.country ?? '';
    case 'state': return e.state ?? '';
    case 'city': return e.city ?? '';
    case 'birth_date': return dateOrEmpty(e.birth_date);
    case 'gender': return e.gender ?? '';
    case 'education_level': return e.education_level ?? '';
    case 'occupation': return e.occupation ?? '';
    case 'status': return statusEsLabel(e.status);
    case 'progress_percentage': return String(Math.round(e.progress_percentage || 0));
    case 'current_step_index': return String(e.current_step_index || 0);
    case 'started_at': return dateOrEmpty(e.started_at);
    case 'completed_at': return dateOrEmpty(e.completed_at);
    default: return '';
  }
}

function loadSavedColumns(): string[] {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return ALL_KEYS;
}

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  data: ApiJourneyEnrolleeRead[];
  journeySlug: string;
  statusFilter: string;
}

export function ExportColumnsDialog({ open, onClose, data, journeySlug, statusFilter }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(loadSavedColumns()));

  // Sync required keys on mount
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of REQUIRED_KEYS) next.add(k);
      return next;
    });
  }, []);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(ALL_KEYS));
  const clearOptional = () => setSelected(new Set(REQUIRED_KEYS));

  const handleExport = () => {
    if (data.length === 0) return;

    const orderedKeys = ALL_KEYS.filter((k) => selected.has(k));
    const headers = orderedKeys.map(
      (k) => ALL_COLUMNS.find((c) => c.key === k)!.label,
    );

    const rows = data.map((e) =>
      orderedKeys.map((k) => escapeCsvCell(getColumnValue(e, k))),
    );

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${journeySlug || 'journey'}_${statusFilter}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Persist selection
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(orderedKeys));

    toast.success(`CSV exportado (${data.length} usuarios, ${orderedKeys.length} columnas)`);
    onClose();
  };

  const selectedCount = selected.size;
  const optionalSelected = selectedCount - REQUIRED_KEYS.length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">Exportar CSV</DialogTitle>
          <p className="text-sm text-slate-500">
            Selecciona las columnas a incluir ({selectedCount} de {ALL_KEYS.length})
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-2 pr-1">
          {COLUMN_GROUPS.map((group) => (
            <div key={group.label}>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {group.label}
              </h4>
              <div className="space-y-2">
                {group.columns.map((col) => {
                  const isRequired = col.required === true;
                  const checked = selected.has(col.key);
                  return (
                    <div key={col.key} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`col-${col.key}`}
                        checked={checked}
                        disabled={isRequired}
                        onCheckedChange={() => toggle(col.key)}
                      />
                      <Label
                        htmlFor={`col-${col.key}`}
                        className={`text-sm cursor-pointer ${
                          isRequired ? 'text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        {col.label}
                        {isRequired && (
                          <span className="text-[10px] text-slate-300 ml-1.5">(requerido)</span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
              <Separator className="mt-3" />
            </div>
          ))}
        </div>

        <DialogFooter className="flex-row gap-2 pt-3 border-t">
          <div className="flex gap-2 mr-auto">
            <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
              Todos
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearOptional}>
              Limpiar
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            disabled={data.length === 0}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar ({data.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
