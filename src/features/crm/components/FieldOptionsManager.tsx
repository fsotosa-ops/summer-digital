'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { crmService } from '@/services/crm.service';
import { ApiFieldOption } from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, GripVertical, EyeOff, Tag } from 'lucide-react';

// Known labels for built-in fields
const KNOWN_LABELS: Record<string, string> = {
  gender: 'Género',
  education_level: 'Nivel Educativo',
  occupation: 'Ocupación',
};

interface EditState {
  option: ApiFieldOption;
  label: string;
  sort_order: number;
}

const generateSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

export function FieldOptionsManager() {
  const [options, setOptions] = useState<ApiFieldOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive unique field names dynamically
  const fieldList = useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((o) => {
      if (!map.has(o.field_name)) {
        map.set(o.field_name, KNOWN_LABELS[o.field_name] || o.field_name.replace(/_/g, ' '));
      }
    });
    // Keep known fields at the top
    const known = Object.keys(KNOWN_LABELS).filter((k) => map.has(k));
    const extra = [...map.keys()].filter((k) => !KNOWN_LABELS[k]);
    return [...known, ...extra].map((key) => ({ value: key, label: map.get(key)! }));
  }, [options]);

  const [activeField, setActiveField] = useState('gender');

  // Sync active field when list changes and current selection disappears
  useEffect(() => {
    if (fieldList.length > 0 && !fieldList.find((f) => f.value === activeField)) {
      setActiveField(fieldList[0].value);
    }
  }, [fieldList, activeField]);

  // ── Add Option ──────────────────────────────────────────────
  const [addOptionOpen, setAddOptionOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Add New Field ────────────────────────────────────────────
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldFirstLabel, setNewFieldFirstLabel] = useState('');
  const [newFieldFirstValue, setNewFieldFirstValue] = useState('');
  const [creatingField, setCreatingField] = useState(false);

  // ── Edit Option ──────────────────────────────────────────────
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Delete ───────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crmService.listFieldOptions(undefined, true);
      setOptions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar opciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const filteredOptions = options
    .filter((o) => o.field_name === activeField)
    .sort((a, b) => a.sort_order - b.sort_order);

  // ── Handlers ─────────────────────────────────────────────────

  const handleAddOption = async () => {
    if (!newLabel.trim() || !newValue.trim()) return;
    setCreating(true);
    try {
      const created = await crmService.createFieldOption({
        field_name: activeField,
        value: newValue,
        label: newLabel,
        sort_order: filteredOptions.length + 1,
        is_active: true,
      });
      setOptions((prev) => [...prev, created]);
      setAddOptionOpen(false);
      setNewLabel('');
      setNewValue('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear opción');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateField = async () => {
    if (!newFieldKey.trim() || !newFieldFirstLabel.trim() || !newFieldFirstValue.trim()) return;
    setCreatingField(true);
    try {
      const created = await crmService.createFieldOption({
        field_name: newFieldKey,
        value: newFieldFirstValue,
        label: newFieldFirstLabel,
        sort_order: 1,
        is_active: true,
      });
      setOptions((prev) => [...prev, created]);
      setActiveField(newFieldKey);
      setAddFieldOpen(false);
      setNewFieldName('');
      setNewFieldKey('');
      setNewFieldFirstLabel('');
      setNewFieldFirstValue('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear campo');
    } finally {
      setCreatingField(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editState) return;
    setSaving(true);
    try {
      const updated = await crmService.updateFieldOption(editState.option.id, {
        label: editState.label,
        sort_order: editState.sort_order,
      });
      setOptions((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setEditState(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (option: ApiFieldOption) => {
    try {
      const updated = await crmService.updateFieldOption(option.id, {
        is_active: !option.is_active,
      });
      setOptions((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta opción? Los contactos que ya la tengan asignada no se verán afectados.'))
      return;
    setDeletingId(id);
    try {
      await crmService.deleteFieldOption(id);
      setOptions((prev) => prev.filter((o) => o.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const activeFieldLabel = fieldList.find((f) => f.value === activeField)?.label ?? activeField;

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}

      {/* Field selector + New Field button */}
      <div className="flex items-center gap-2 flex-wrap">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          fieldList.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveField(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeField === f.value
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))
        )}

        {/* New Field dialog */}
        <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
          <DialogTrigger asChild>
            <button className="px-4 py-1.5 rounded-full text-sm font-medium border-2 border-dashed border-slate-300 text-slate-500 hover:border-fuchsia-400 hover:text-fuchsia-600 transition-colors flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Nuevo campo
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear nuevo campo de perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nombre del campo (visible) *</Label>
                <Input
                  value={newFieldName}
                  onChange={(e) => {
                    setNewFieldName(e.target.value);
                    setNewFieldKey(generateSlug(e.target.value));
                  }}
                  placeholder="Ej: Sector de Trabajo"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Clave interna (auto-generada)</Label>
                <Input
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  className="font-mono text-sm text-slate-500"
                  placeholder="sector_de_trabajo"
                />
                <p className="text-xs text-slate-400">
                  Identificador único del campo en la base de datos.
                </p>
              </div>
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm text-slate-600 font-medium">Primera opción del campo *</p>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Etiqueta</Label>
                  <Input
                    value={newFieldFirstLabel}
                    onChange={(e) => {
                      setNewFieldFirstLabel(e.target.value);
                      setNewFieldFirstValue(generateSlug(e.target.value));
                    }}
                    placeholder="Ej: Tecnología"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Valor interno</Label>
                  <Input
                    value={newFieldFirstValue}
                    onChange={(e) => setNewFieldFirstValue(e.target.value)}
                    className="font-mono text-sm text-slate-500"
                    placeholder="tecnologia"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddFieldOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleCreateField}
                disabled={creatingField || !newFieldKey || !newFieldFirstLabel || !newFieldFirstValue}
                className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white"
              >
                {creatingField ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Crear campo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Options list for active field */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {activeFieldLabel}{' '}
              <span className="text-slate-400 font-normal">— {filteredOptions.length} opciones</span>
            </CardTitle>
            <Dialog open={addOptionOpen} onOpenChange={setAddOptionOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white h-8">
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva opción
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Nueva opción — {activeFieldLabel}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Etiqueta (visible) *</Label>
                    <Input
                      value={newLabel}
                      onChange={(e) => {
                        setNewLabel(e.target.value);
                        setNewValue(generateSlug(e.target.value));
                      }}
                      placeholder="Ej: Maestría"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor interno</Label>
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="font-mono text-sm text-slate-500"
                      placeholder="maestria"
                    />
                    <p className="text-xs text-slate-400">Valor que se guarda en la base de datos.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOptionOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={handleAddOption}
                    disabled={creating || !newLabel || !newValue}
                    className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Crear
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredOptions.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">
              No hay opciones para este campo. Crea la primera con el botón de arriba.
            </p>
          ) : (
            <div className="divide-y">
              {filteredOptions.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3 py-2.5">
                  <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />

                  {editState?.option.id === opt.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={editState.label}
                        onChange={(e) =>
                          setEditState((prev) => prev && { ...prev, label: e.target.value })
                        }
                        className="h-8 text-sm flex-1"
                        autoFocus
                      />
                      <Input
                        type="number"
                        value={editState.sort_order}
                        onChange={(e) =>
                          setEditState((prev) =>
                            prev && { ...prev, sort_order: Number(e.target.value) },
                          )
                        }
                        className="h-8 text-sm w-16"
                        placeholder="#"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="h-8 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white"
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditState(null)}
                        className="h-8"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm font-medium ${!opt.is_active ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                        >
                          {opt.label}
                        </span>
                        <span className="ml-2 text-xs text-slate-400 font-mono">{opt.value}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!opt.is_active && (
                          <Badge variant="outline" className="text-xs text-slate-400">
                            Inactiva
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-fuchsia-600"
                          onClick={() =>
                            setEditState({ option: opt, label: opt.label, sort_order: opt.sort_order })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${opt.is_active ? 'text-slate-400 hover:text-orange-500' : 'text-orange-400 hover:text-green-600'}`}
                          onClick={() => handleToggleActive(opt)}
                          title={opt.is_active ? 'Desactivar' : 'Activar'}
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(opt.id)}
                          disabled={deletingId === opt.id}
                        >
                          {deletingId === opt.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
