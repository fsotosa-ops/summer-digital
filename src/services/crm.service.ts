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
  ApiFieldOption,
  ApiFieldOptionCreate,
  ApiFieldOptionUpdate,
  ApiEnrollmentResponse,
  ApiEnrollmentDetailResponse,
  ApiUserPointsSummary,
  ApiCrmOrgProfile,
  ApiCrmOrgProfileUpdate,
  ApiContactEventParticipation,
} from '@/types/api.types';

class CrmService {
  async listContacts(
    offset = 0,
    limit = 50,
    search?: string,
    orgId?: string,
  ): Promise<ApiCrmContactsResponse> {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    });
    if (search) params.set('search', search);
    if (orgId) params.set('organization_id', orgId);
    return apiClient.get<ApiCrmContactsResponse>(
      `/crm/contacts/?${params.toString()}`,
    );
  }

  async getContact(contactId: string): Promise<ApiCrmContact> {
    return apiClient.get<ApiCrmContact>(`/crm/contacts/${contactId}`);
  }

  async getMyContact(): Promise<ApiCrmContact> {
    return apiClient.get<ApiCrmContact>('/crm/contacts/me');
  }

  async updateContact(
    contactId: string,
    data: Partial<ApiCrmContact>,
  ): Promise<ApiCrmContact> {
    return apiClient.patch<ApiCrmContact>(`/crm/contacts/${contactId}`, data);
  }

  async updateMyContact(data: Partial<ApiCrmContact>): Promise<ApiCrmContact> {
    return apiClient.patch<ApiCrmContact>('/crm/contacts/me', data);
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

  async getStats(orgId?: string): Promise<ApiCrmStats> {
    const query = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : '';
    return apiClient.get<ApiCrmStats>(`/crm/stats/${query}`);
  }

  async listTasks(
    offset = 0,
    limit = 50,
    status?: string,
    assignedTo?: string,
    orgId?: string,
  ): Promise<ApiCrmTask[]> {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    });
    if (status) params.set('status', status);
    if (assignedTo) params.set('assigned_to', assignedTo);
    if (orgId) params.set('organization_id', orgId);
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

  // Field Options
  async listFieldOptions(fieldName?: string, includeInactive = false): Promise<ApiFieldOption[]> {
    const params = new URLSearchParams();
    if (fieldName) params.set('field_name', fieldName);
    if (includeInactive) params.set('include_inactive', 'true');
    return apiClient.get<ApiFieldOption[]>(`/crm/field-options/?${params.toString()}`);
  }

  async createFieldOption(data: ApiFieldOptionCreate): Promise<ApiFieldOption> {
    return apiClient.post<ApiFieldOption>('/crm/field-options/', data);
  }

  async updateFieldOption(id: string, data: ApiFieldOptionUpdate): Promise<ApiFieldOption> {
    return apiClient.patch<ApiFieldOption>(`/crm/field-options/${id}`, data);
  }

  async deleteFieldOption(id: string): Promise<void> {
    return apiClient.delete(`/crm/field-options/${id}`);
  }

  // --- Admin: user enrollments & gamification ---

  async getAdminUserEnrollments(userId: string): Promise<ApiEnrollmentResponse[]> {
    return apiClient.get<ApiEnrollmentResponse[]>(
      `/journeys/admin/enrollments/user/${userId}`,
    );
  }

  async getAdminUserEnrollmentDetails(userId: string): Promise<ApiEnrollmentDetailResponse[]> {
    return apiClient.get<ApiEnrollmentDetailResponse[]>(
      `/journeys/admin/enrollments/user/${userId}/details`,
    );
  }

  async adminUnenrollUser(enrollmentId: string): Promise<void> {
    return apiClient.delete(`/journeys/admin/enrollments/${enrollmentId}`);
  }

  async getAdminUserGamificationSummary(userId: string): Promise<ApiUserPointsSummary> {
    return apiClient.get<ApiUserPointsSummary>(
      `/gamification/admin/progress/user/${userId}/summary`,
    );
  }

  // --- CRM Org Profiles ---

  async getOrgProfile(orgId: string): Promise<ApiCrmOrgProfile> {
    return apiClient.get<ApiCrmOrgProfile>(`/crm/org-profiles/${orgId}`);
  }

  async updateOrgProfile(orgId: string, data: ApiCrmOrgProfileUpdate): Promise<ApiCrmOrgProfile> {
    return apiClient.patch<ApiCrmOrgProfile>(`/crm/org-profiles/${orgId}`, data);
  }

  // --- Contact Event Participation ---

  async getContactEvents(userId: string): Promise<ApiContactEventParticipation[]> {
    return apiClient.get<ApiContactEventParticipation[]>(`/crm/contacts/${userId}/events`);
  }

  // --- CSV Export for Brevo ---

  async exportContactsCsv(filters?: {
    organizationIds?: string[];
    createdFrom?: string;
    createdTo?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.organizationIds?.length) {
      params.set('organization_ids', filters.organizationIds.join(','));
    }
    if (filters?.createdFrom) params.set('created_from', filters.createdFrom);
    if (filters?.createdTo) params.set('created_to', filters.createdTo);
    const qs = params.toString();
    const response = await apiClient.getRaw(`/crm/contacts/export/csv${qs ? `?${qs}` : ''}`);
    return response.blob();
  }
}

export const crmService = new CrmService();