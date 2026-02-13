import { apiClient } from '@/lib/api-client';
import {
  ApiCrmContact,
  ApiCrmContactsResponse,
  ApiCrmNote,
  ApiCrmNoteCreate,
  ApiCrmTask,
  ApiCrmTaskCreate,
  ApiCrmTimelineItem,
  ApiCrmStats,
} from '@/types/api.types';

class CrmService {
  async listContacts(
    offset = 0,
    limit = 50,
    search?: string,
  ): Promise<ApiCrmContactsResponse> {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    });
    if (search) params.set('search', search);
    return apiClient.get<ApiCrmContactsResponse>(
      `/crm/contacts?${params.toString()}`,
    );
  }

  async getContact(contactId: string): Promise<ApiCrmContact> {
    return apiClient.get<ApiCrmContact>(`/crm/contacts/${contactId}`);
  }

  async updateContact(
    contactId: string,
    data: Partial<ApiCrmContact>,
  ): Promise<ApiCrmContact> {
    return apiClient.patch<ApiCrmContact>(`/crm/contacts/${contactId}`, data);
  }

  async getContactNotes(contactId: string): Promise<ApiCrmNote[]> {
    return apiClient.get<ApiCrmNote[]>(`/crm/contacts/${contactId}/notes`);
  }

  async createNote(
    contactId: string,
    data: ApiCrmNoteCreate,
  ): Promise<ApiCrmNote> {
    return apiClient.post<ApiCrmNote>(
      `/crm/contacts/${contactId}/notes`,
      data,
    );
  }

  async getContactTasks(contactId: string): Promise<ApiCrmTask[]> {
    return apiClient.get<ApiCrmTask[]>(`/crm/contacts/${contactId}/tasks`);
  }

  async createTask(
    contactId: string,
    data: ApiCrmTaskCreate,
  ): Promise<ApiCrmTask> {
    return apiClient.post<ApiCrmTask>(
      `/crm/contacts/${contactId}/tasks`,
      data,
    );
  }

  async getContactTimeline(contactId: string): Promise<ApiCrmTimelineItem[]> {
    return apiClient.get<ApiCrmTimelineItem[]>(
      `/crm/contacts/${contactId}/timeline`,
    );
  }

  async getStats(): Promise<ApiCrmStats> {
    return apiClient.get<ApiCrmStats>('/crm/stats/');
  }

  async listTasks(
    offset = 0,
    limit = 50,
    status?: string,
    assignedTo?: string,
  ): Promise<ApiCrmTask[]> {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    });
    if (status) params.set('status', status);
    if (assignedTo) params.set('assigned_to', assignedTo);
    return apiClient.get<ApiCrmTask[]>(`/crm/tasks/?${params.toString()}`);
  }

  async updateTask(
    taskId: string,
    data: Partial<ApiCrmTask>,
  ): Promise<ApiCrmTask> {
    return apiClient.patch<ApiCrmTask>(`/crm/tasks/${taskId}`, data);
  }

  async deleteTask(taskId: string): Promise<void> {
    return apiClient.delete(`/crm/tasks/${taskId}`);
  }

  async updateNote(
    noteId: string,
    data: Partial<ApiCrmNoteCreate>,
  ): Promise<ApiCrmNote> {
    return apiClient.patch<ApiCrmNote>(`/crm/notes/${noteId}`, data);
  }

  async deleteNote(noteId: string): Promise<void> {
    return apiClient.delete(`/crm/notes/${noteId}`);
  }
}

export const crmService = new CrmService();
