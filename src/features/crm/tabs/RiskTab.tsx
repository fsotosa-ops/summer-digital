'use client';

import { useState, useEffect, useCallback } from 'react';
import { crmService } from '@/services/crm.service';
import { ApiCrmContact, ApiCrmTaskCreate, ApiCrmNoteCreate, ApiUser } from '@/types/api.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileText,
  ClipboardList,
  ExternalLink,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';
import { ContactDetailSheet } from '../components/contact-detail';

type SortKey = 'last_seen' | 'oasis_score';

function getInitials(name: string | null | undefined, email: string): string {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return email[0].toUpperCase();
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function crmContactToUserStub(contact: ApiCrmContact): ApiUser {
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || null;
  return {
    id: contact.user_id,
    email: contact.email,
    full_name: fullName,
    avatar_url: contact.avatar_url ?? null,
    is_platform_admin: false,
    status: 'active',
    created_at: contact.created_at ?? null,
    organizations: [],
  };
}

export function RiskTab({ orgId }: { orgId?: string }) {
  const [contacts, setContacts] = useState<ApiCrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('last_seen');

  // Note quick-add
  const [noteTarget, setNoteTarget] = useState<ApiCrmContact | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Task quick-add
  const [taskTarget, setTaskTarget] = useState<ApiCrmContact | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // Full detail sheet
  const [detailUser, setDetailUser] = useState<ApiUser | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await crmService.listContacts(0, 100, undefined, orgId, 'risk');
      setContacts(result.contacts);
    } catch {
      toast.error('Error al cargar participantes en riesgo');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { loadData(); }, [loadData]);

  const sorted = [...contacts].sort((a, b) => {
    if (sortKey === 'last_seen') return daysSince(a.last_seen_at) - daysSince(b.last_seen_at);
    return (a.oasis_score ?? 0) - (b.oasis_score ?? 0);
  });

  const handleSaveNote = async () => {
    if (!noteTarget || !noteContent.trim()) return;
    setSavingNote(true);
    try {
      const data: ApiCrmNoteCreate = { content: noteContent.trim(), tags: [] };
      await crmService.createNote(noteTarget.user_id, data);
      toast.success('Nota guardada');
      setNoteTarget(null);
      setNoteContent('');
    } catch {
      toast.error('Error al guardar nota');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveTask = async () => {
    if (!taskTarget || !taskTitle.trim()) return;
    setSavingTask(true);
    try {
      const data: ApiCrmTaskCreate = {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        priority: 'high',
      };
      await crmService.createTask(taskTarget.user_id, data);
      toast.success('Tarea creada');
      setTaskTarget(null);
      setTaskTitle('');
      setTaskDesc('');
    } catch {
      toast.error('Error al crear tarea');
    } finally {
      setSavingTask(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Participantes en Riesgo
            <span className="ml-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              {contacts.length}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Sin actividad reciente — intervención recomendada</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortKey((s) => s === 'last_seen' ? 'oasis_score' : 'last_seen')}
            className="h-8 text-slate-500 hover:text-summer-pink text-xs gap-1"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortKey === 'last_seen' ? 'Días inactivo' : 'Oasis Score'}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadData} className="h-8 text-slate-500 hover:text-summer-pink">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">No hay participantes en riesgo</p>
            <p className="text-xs text-slate-400 mt-1">¡Todos los participantes están activos!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
          {sorted.map((c) => {
            const displayName = [c.first_name, c.last_name].filter(Boolean).join(' ') || null;
            const days = daysSince(c.last_seen_at);

            return (
              <div key={c.user_id} className="p-4 hover:bg-amber-50/30 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={c.avatar_url || undefined} />
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-bold">
                        {getInitials(displayName, c.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-amber-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">{displayName || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-500 truncate">{c.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.oasis_score != null && (
                          <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                            Score {c.oasis_score}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50">
                          {days < 999 ? `${days}d inactivo` : 'Sin actividad'}
                        </Badge>
                      </div>
                    </div>

                    {c.last_seen_at && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Última actividad: {formatRelativeTime(c.last_seen_at)}
                      </p>
                    )}

                    {/* Quick actions */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-slate-200 text-slate-600 hover:border-summer-pink hover:text-summer-pink"
                        onClick={() => { setNoteTarget(c); setNoteContent(''); }}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Nota
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-slate-200 text-slate-600 hover:border-summer-pink hover:text-summer-pink"
                        onClick={() => { setTaskTarget(c); setTaskTitle(''); setTaskDesc(''); }}
                      >
                        <ClipboardList className="h-3 w-3 mr-1" />
                        Tarea
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-slate-400 hover:text-summer-pink"
                        onClick={() => setDetailUser(crmContactToUserStub(c))}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver perfil
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note dialog */}
      <Dialog open={!!noteTarget} onOpenChange={(open) => { if (!open) setNoteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar nota — {[noteTarget?.first_name, noteTarget?.last_name].filter(Boolean).join(' ') || noteTarget?.email}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Escribe una nota sobre este participante..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTarget(null)} disabled={savingNote}>Cancelar</Button>
            <Button onClick={handleSaveNote} disabled={savingNote || !noteContent.trim()}>
              {savingNote ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Guardar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task dialog */}
      <Dialog open={!!taskTarget} onOpenChange={(open) => { if (!open) setTaskTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear tarea — {[taskTarget?.first_name, taskTarget?.last_name].filter(Boolean).join(' ') || taskTarget?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Título de la tarea *"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <Textarea
              placeholder="Descripción (opcional)"
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskTarget(null)} disabled={savingTask}>Cancelar</Button>
            <Button onClick={handleSaveTask} disabled={savingTask || !taskTitle.trim()}>
              {savingTask ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Crear Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full contact detail sheet */}
      <ContactDetailSheet
        user={detailUser}
        onClose={() => setDetailUser(null)}
        onUserUpdated={(updated) => setDetailUser(updated)}
        onUserDeleted={() => { setDetailUser(null); loadData(); }}
      />
    </div>
  );
}
