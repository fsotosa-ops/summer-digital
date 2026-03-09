import { apiClient } from '@/lib/api-client';
import {
  ApiAttendanceCreate,
  ApiAttendanceResponse,
  ApiAttendanceUpdate,
  ApiEvent,
  ApiEventCreate,
  ApiEventJourneyAdd,
  ApiEventJourneyResponse,
  ApiEventUpdate,
} from '@/types/api.types';

class EventService {
  // ---------------------------------------------------------------------------
  // Events CRUD
  // ---------------------------------------------------------------------------

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

  /** Obtiene un evento por ID sin orgId — para el gateway QR (cualquier usuario autenticado). */
  async getEventById(eventId: string): Promise<ApiEvent> {
    return apiClient.get<ApiEvent>(`/auth/events/${eventId}`);
  }

  /** Unified join flow: org membership + attendance + enrollment. */
  async joinEvent(eventId: string): Promise<{ event_id: string; organization_id: string; org_joined: boolean; attendance_registered: boolean; journey_enrolled: string | null }> {
    return apiClient.post(`/auth/events/${eventId}/join`, {});
  }

  // ---------------------------------------------------------------------------
  // Event ↔ Journey assignment
  // ---------------------------------------------------------------------------

  async listEventJourneys(orgId: string, eventId: string): Promise<ApiEventJourneyResponse[]> {
    return apiClient.get<ApiEventJourneyResponse[]>(
      `/auth/organizations/${orgId}/events/${eventId}/journeys`
    );
  }

  async addJourneyToEvent(
    orgId: string,
    eventId: string,
    data: ApiEventJourneyAdd
  ): Promise<ApiEventJourneyResponse> {
    return apiClient.post<ApiEventJourneyResponse>(
      `/auth/organizations/${orgId}/events/${eventId}/journeys`,
      data
    );
  }

  async removeJourneyFromEvent(
    orgId: string,
    eventId: string,
    journeyId: string
  ): Promise<void> {
    await apiClient.delete(
      `/auth/organizations/${orgId}/events/${eventId}/journeys/${journeyId}`
    );
  }

  // ---------------------------------------------------------------------------
  // Attendance
  // ---------------------------------------------------------------------------

  async listAttendances(orgId: string, eventId: string): Promise<ApiAttendanceResponse[]> {
    return apiClient.get<ApiAttendanceResponse[]>(
      `/auth/organizations/${orgId}/events/${eventId}/attendances`
    );
  }

  async registerAttendance(
    orgId: string,
    eventId: string,
    data: ApiAttendanceCreate
  ): Promise<ApiAttendanceResponse> {
    return apiClient.post<ApiAttendanceResponse>(
      `/auth/organizations/${orgId}/events/${eventId}/attendances`,
      data
    );
  }

  async updateAttendance(
    orgId: string,
    eventId: string,
    attendanceId: string,
    data: ApiAttendanceUpdate
  ): Promise<ApiAttendanceResponse> {
    return apiClient.patch<ApiAttendanceResponse>(
      `/auth/organizations/${orgId}/events/${eventId}/attendances/${attendanceId}`,
      data
    );
  }

  async removeAttendance(
    orgId: string,
    eventId: string,
    attendanceId: string
  ): Promise<void> {
    await apiClient.delete(
      `/auth/organizations/${orgId}/events/${eventId}/attendances/${attendanceId}`
    );
  }
}

export const eventService = new EventService();
