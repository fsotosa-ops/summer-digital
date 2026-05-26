'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { settingsService } from '@/services/settings.service';
import { ApiPlatformSettings } from '@/types/api.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ClipboardList, FileText } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<ApiPlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [diagnosisUrl, setDiagnosisUrl] = useState('');
  const [closureUrl, setClosureUrl] = useState('');

  useEffect(() => {
    settingsService.getPlatformSettings()
      .then((data) => {
        setSettings(data);
        setDiagnosisUrl(data.diagnosis_form_url ?? '');
        setClosureUrl(data.closure_form_url ?? '');
      })
      .catch(() => toast.error('Error al cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await settingsService.updatePlatformSettings({
        diagnosis_form_url: diagnosisUrl.trim() || null,
        closure_form_url: closureUrl.trim() || null,
      });
      setSettings(updated);
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    diagnosisUrl !== (settings?.diagnosis_form_url ?? '') ||
    closureUrl !== (settings?.closure_form_url ?? '');

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Configuración de plataforma</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ajustes globales aplicados a todos los eventos y organizaciones.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formularios de eventos</CardTitle>
          <CardDescription>
            URLs de Typeform usadas en los tabs de Diagnóstico y Cierre de todos los eventos.
            Los cambios se aplican de inmediato a toda la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
              URL Diagnóstico (pre-evento)
            </Label>
            <Input
              value={diagnosisUrl}
              onChange={(e) => setDiagnosisUrl(e.target.value)}
              placeholder="https://form.typeform.com/to/..."
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              URL Cierre (post-evento)
            </Label>
            <Input
              value={closureUrl}
              onChange={(e) => setClosureUrl(e.target.value)}
              placeholder="https://form.typeform.com/to/..."
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {settings?.updated_at && (
              <p className="text-xs text-slate-400">
                Última actualización:{' '}
                {new Date(settings.updated_at).toLocaleDateString('es-CL', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="ml-auto bg-gradient-to-r from-summer-pink to-summer-lavender hover:from-summer-pink hover:to-summer-lavender text-white shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Guardar cambios</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
