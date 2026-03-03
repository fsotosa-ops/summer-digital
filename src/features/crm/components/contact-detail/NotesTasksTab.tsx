'use client';

import React from 'react';
import {
  ApiCrmNote,
  ApiCrmTask,
  ApiCrmTaskStatus,
  ApiCrmTaskPriority,
} from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  StickyNote,
  CheckSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PRIORITY_LABELS } from './constants';

const PRIORITY_COLORS: Record<ApiCrmTaskPriority, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

interface NotesTasksTabProps {
  notes: ApiCrmNote[];
  tasks: ApiCrmTask[];
  notesLoading: boolean;
  newNoteContent: string;
  savingNote: boolean;
  newTaskTitle: string;
  newTaskPriority: ApiCrmTaskPriority;
  savingTask: boolean;
  onNewNoteContentChange: (content: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onNewTaskTitleChange: (title: string) => void;
  onNewTaskPriorityChange: (priority: ApiCrmTaskPriority) => void;
  onCreateTask: () => void;
  onUpdateTaskStatus: (taskId: string, status: ApiCrmTaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

export function NotesTasksTab({
  notes,
  tasks,
  notesLoading,
  newNoteContent,
  savingNote,
  newTaskTitle,
  newTaskPriority,
  savingTask,
  onNewNoteContentChange,
  onCreateNote,
  onDeleteNote,
  onNewTaskTitleChange,
  onNewTaskPriorityChange,
  onCreateTask,
  onUpdateTaskStatus,
  onDeleteTask,
}: NotesTasksTabProps) {
  if (notesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── NOTES ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5" />
            Notas ({notes.length})
          </p>
        </div>

        {/* Create note */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
          <Textarea
            value={newNoteContent}
            onChange={(e) => onNewNoteContentChange(e.target.value)}
            placeholder="Escribir una nota..."
            className="min-h-[60px] text-sm border-0 bg-slate-50 rounded-lg focus:ring-1 focus:ring-fuchsia-200 resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={onCreateNote}
              disabled={savingNote || !newNoteContent.trim()}
              className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white h-8 rounded-lg"
            >
              {savingNote && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar nota
            </Button>
          </div>
        </div>

        {/* Notes list */}
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/70 group hover:shadow-sm transition-shadow"
            >
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-100/50">
                <p className="text-[10px] text-slate-400 font-medium">
                  {new Date(note.created_at).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                  onClick={() => onDeleteNote(note.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center py-6">
              <StickyNote className="h-8 w-8 mx-auto text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">Sin notas aún</p>
            </div>
          )}
        </div>
      </div>

      {/* ── TASKS ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            Tareas ({tasks.length})
          </p>
        </div>

        {/* Create task */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <div className="flex gap-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => onNewTaskTitleChange(e.target.value)}
              placeholder="Nueva tarea..."
              className="h-8 text-sm flex-1 border-0 bg-slate-50 rounded-lg focus:ring-1 focus:ring-fuchsia-200"
              onKeyDown={(e) => e.key === 'Enter' && onCreateTask()}
            />
            <Select
              value={newTaskPriority}
              onValueChange={(v) => onNewTaskPriorityChange(v as ApiCrmTaskPriority)}
            >
              <SelectTrigger className="h-8 w-24 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={onCreateTask}
              disabled={savingTask || !newTaskTitle.trim()}
              className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white h-8 w-8 p-0 rounded-lg"
            >
              {savingTask ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Tasks list */}
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-3 rounded-xl border group hover:shadow-sm transition-shadow ${
                task.status === 'completed'
                  ? 'bg-emerald-50/30 border-emerald-100'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      task.status === 'completed'
                        ? 'text-slate-400 line-through'
                        : 'text-slate-700'
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded-lg"
                  onClick={() => onDeleteTask(task.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <Select
                  value={task.status}
                  onValueChange={(v) =>
                    onUpdateTaskStatus(task.id, v as ApiCrmTaskStatus)
                  }
                >
                  <SelectTrigger className="h-6 text-[11px] w-auto border-0 p-0 px-1.5 rounded-md">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${TASK_STATUS_COLORS[task.status]}`}
                    >
                      {TASK_STATUS_LABELS[task.status]}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="in_progress">En progreso</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${PRIORITY_COLORS[task.priority]}`}
                >
                  {PRIORITY_LABELS[task.priority]}
                </Badge>
                {task.due_date && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(task.due_date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-6">
              <CheckSquare className="h-8 w-8 mx-auto text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">Sin tareas aún</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
