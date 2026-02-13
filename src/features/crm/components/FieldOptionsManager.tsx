'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Pencil, Trash2, Loader2, GripVertical, EyeOff } from 'lucide-react';

const FIELD_NAMES = [
  { value: 'gender', label: 'Género' },
  { value: 'education_level', label: 'Nivel Educativo' },
  { value: 'occupation', label: 'Ocupación' },
];

interface EditState {
  option: ApiFieldOption;
  label: string;
  sort_order: number;
}

export function FieldOptionsManager() {
  const [options, setOptions] = useState<ApiFieldOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeField, setActiveField] = useState('gender');
  const [error, setError] = useState<string | null>(null);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crmService.listFieldOptions(undefined, true); // include inactive
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

  const generateValue = (label: string) =>
    label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

  const handleLabelChange = (label: string) => {
    setNewLabel(label);
    setNewValue(generateValue(label));
  };

  const handleCreate = async () => {
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
      setCreateOpen(false);
      setNewLabel('');
      setNewValue('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear opción');
    } finally {
      setCreating(false);
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

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}

      {/* Field tabs */}
      <div className="flex gap-2 flex-wrap">
        {FIELD_NAMES.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveField(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeField === f.value
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Options list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {FIELD_NAMES.find((f) => f.value === activeField)?.label} —{' '}
              <span className="text-slate-400 font-normal">{filteredOptions.length} opciones</span>
            </CardTitle>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 h-8">
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva opción
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>
                    Nueva opción — {FIELD_NAMES.find((f) => f.value === activeField)?.label}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Etiqueta (visible para el usuario) *</Label>
                    <Input
                      value={newLabel}
                      onChange={(e) => handleLabelChange(e.target.value)}
                      placeholder="Ej: Maestría en Educación"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor interno (auto-generado)</Label>
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="master_educacion"
                      className="font-mono text-sm text-slate-500"
                    />
                    <p className="text-xs text-slate-400">
                      Valor técnico que se guarda en la base de datos.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !newLabel || !newValue}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
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
              No hay opciones para este campo
            </p>
          ) : (
            <div className="divide-y">
              {filteredOptions.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3 py-2.5">
                  <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />

                  {editState?.option.id === opt.id ? (
                    // Inline edit
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
                        className="h-8 bg-teal-600 hover:bg-teal-700"
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
                    // Display row
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
                          className="h-7 w-7 text-slate-400 hover:text-slate-600"
                          onClick={() =>
                            setEditState({
                              option: opt,
                              label: opt.label,
                              sort_order: opt.sort_order,
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${opt.is_active ? 'text-slate-400 hover:text-orange-500' : 'text-orange-400 hover:text-teal-600'}`}
                          onClick={() => handleToggleActive(opt)}
                          title={opt.is_active ? 'Desactivar' : 'Activar'}
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
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
