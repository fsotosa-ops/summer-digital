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
    <div className="max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* --- Notes section --- */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5" />
          Notas ({notes.length})
        </p>

        {/* Create note */}
        <div className="space-y-2">
          <Textarea
            value={newNoteContent}
            onChange={(e) => onNewNoteContentChange(e.target.value)}
            placeholder="Escribir una nota..."
            className="min-h-[60px] text-sm"
          />
          <Button
            size="sm"
            onClick={onCreateNote}
            disabled={savingNote || !newNoteContent.trim()}
            className="bg-teal-600 hover:bg-teal-700 h-8"
          >
            {savingNote && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            <Plus className="h-3.5 w-3.5 mr-1" />
            Agregar nota
          </Button>
        </div>

        {/* Notes list */}
        {notes.map((note) => (
          <div
            key={note.id}
            className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 group"
          >
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {note.content}
            </p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-slate-400">
                {new Date(note.created_at).toLocaleDateString('es-CL', {
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
                className="h-6 w-6 p-0 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDeleteNote(note.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-2">
            Sin notas
          </p>
        )}
      </div>

      {/* --- Tasks section --- */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <CheckSquare className="h-3.5 w-3.5" />
          Tareas ({tasks.length})
        </p>

        {/* Create task */}
        <div className="flex gap-2">
          <Input
            value={newTaskTitle}
            onChange={(e) => onNewTaskTitleChange(e.target.value)}
            placeholder="Nueva tarea..."
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => e.key === 'Enter' && onCreateTask()}
          />
          <Select
            value={newTaskPriority}
            onValueChange={(v) => onNewTaskPriorityChange(v as ApiCrmTaskPriority)}
          >
            <SelectTrigger className="h-8 w-24 text-xs">
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
            className="bg-teal-600 hover:bg-teal-700 h-8"
          >
            {savingTask ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Tasks list */}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="p-3 bg-slate-50 rounded-lg border border-slate-100 group"
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
                className="h-6 w-6 p-0 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => onDeleteTask(task.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Select
                value={task.status}
                onValueChange={(v) =>
                  onUpdateTaskStatus(task.id, v as ApiCrmTaskStatus)
                }
              >
                <SelectTrigger className="h-6 text-[11px] w-auto border-0 p-0 px-1.5">
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
                className="text-[10px]"
              >
                {PRIORITY_LABELS[task.priority]}
              </Badge>
              {task.due_date && (
                <span className="text-[10px] text-slate-400">
                  {new Date(task.due_date).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-2">
            Sin tareas
          </p>
        )}
      </div>
    </div>
  );
}
