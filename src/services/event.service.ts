import { apiClient } from '@/lib/api-client';
import { ApiEvent, ApiEventCreate, ApiEventUpdate } from '@/types/api.types';

class EventService {
  async listOrgEvents(orgId: string): Promise<ApiEvent[]> {
    return apiClient.get<ApiEvent[]>(`/auth/organizations/${orgId}/events`);
  }

  async createEvent(orgId: string, data: ApiEventCreate): Promise<ApiEvent> {
    return apiClient.post<ApiEvent>(`/auth/organizations/${orgId}/events`, data);
  }

  async getEvent(orgId: string, eventId: string): Promise<ApiEvent> {
    return apiClient.get<ApiEvent>(`/auth/organizations/${orgId}/events/${eventId}`);
  }

  async updateEvent(orgId: string, eventId: string, data: ApiEventUpdate): Promise<ApiEvent> {
    return apiClient.patch<ApiEvent>(`/auth/organizations/${orgId}/events/${eventId}`, data);
  }

  async deleteEvent(orgId: string, eventId: string): Promise<void> {
    await apiClient.delete(`/auth/organizations/${orgId}/events/${eventId}`);
  }

  /** Obtiene un evento por ID sin necesitar orgId — usado por el gateway del evento. */
  async getEventById(eventId: string): Promise<ApiEvent> {
    return apiClient.get<ApiEvent>(`/auth/events/${eventId}`);
  }
}

export const eventService = new EventService();
