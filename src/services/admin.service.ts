import { apiClient } from '@/lib/api-client';
import {
  ApiJourneyAdminRead,
  ApiJourneyCreate,
  ApiJourneyUpdate,
  ApiJourneyOrganizationsResponse,
  ApiMemberResponse,
  ApiMemberUpdate,
  ApiStepAdminRead,
  ApiStepCreate,
  ApiStepUpdate,
  ApiStepReorderRequest,
} from '@/types/api.types';

class AdminService {
  // --- Journey Management ---

  async listJourneys(orgId: string, isActive?: boolean | null): Promise<ApiJourneyAdminRead[]> {
    const params = new URLSearchParams();
    if (isActive !== undefined && isActive !== null) params.set('is_active', String(isActive));
    const qs = params.toString();
    return apiClient.get<ApiJourneyAdminRead[]>(`/journeys/${orgId}/admin/journeys${qs ? `?${qs}` : ''}`);
  }

  async getJourney(orgId: string, journeyId: string): Promise<ApiJourneyAdminRead> {
    return apiClient.get<ApiJourneyAdminRead>(`/journeys/${orgId}/admin/journeys/${journeyId}`);
  }

  async createJourney(orgId: string, data: ApiJourneyCreate): Promise<ApiJourneyAdminRead> {
    return apiClient.post<ApiJourneyAdminRead>(`/journeys/${orgId}/admin/journeys`, data);
  }

  async updateJourney(orgId: string, journeyId: string, data: ApiJourneyUpdate): Promise<ApiJourneyAdminRead> {
    return apiClient.patch<ApiJourneyAdminRead>(`/journeys/${orgId}/admin/journeys/${journeyId}`, data);
  }

  async deleteJourney(orgId: string, journeyId: string): Promise<void> {
    await apiClient.delete(`/journeys/${orgId}/admin/journeys/${journeyId}`);
  }

  async publishJourney(orgId: string, journeyId: string): Promise<ApiJourneyAdminRead> {
    return apiClient.post<ApiJourneyAdminRead>(`/journeys/${orgId}/admin/journeys/${journeyId}/publish`, {});
  }

  async archiveJourney(orgId: string, journeyId: string): Promise<ApiJourneyAdminRead> {
    return apiClient.post<ApiJourneyAdminRead>(`/journeys/${orgId}/admin/journeys/${journeyId}/archive`, {});
  }

  // --- Member Management ---

  async listMembers(orgId: string): Promise<ApiMemberResponse[]> {
    return apiClient.get<ApiMemberResponse[]>(`/auth/organizations/${orgId}/members`);
  }

  async updateMember(orgId: string, memberId: string, data: ApiMemberUpdate): Promise<ApiMemberResponse> {
    return apiClient.patch<ApiMemberResponse>(`/auth/organizations/${orgId}/members/${memberId}`, data);
  }

  async removeMember(orgId: string, memberId: string): Promise<void> {
    await apiClient.delete(`/auth/organizations/${orgId}/members/${memberId}`);
  }

  // --- Journey-Organization Management ---

  async getJourneyOrganizations(journeyId: string): Promise<ApiJourneyOrganizationsResponse> {
    return apiClient.get<ApiJourneyOrganizationsResponse>(`/journeys/admin/journeys/${journeyId}/organizations`);
  }

  async assignJourneyOrganizations(journeyId: string, organizationIds: string[]): Promise<void> {
    await apiClient.post(`/journeys/admin/journeys/${journeyId}/organizations`, { organization_ids: organizationIds });
  }

  async unassignJourneyOrganizations(journeyId: string, organizationIds: string[]): Promise<void> {
    await apiClient.delete(`/journeys/admin/journeys/${journeyId}/organizations`, { organization_ids: organizationIds });
  }

  // --- Step Management ---

  async listSteps(orgId: string, journeyId: string): Promise<ApiStepAdminRead[]> {
    return apiClient.get<ApiStepAdminRead[]>(`/journeys/${orgId}/admin/journeys/${journeyId}/steps`);
  }

  async createStep(orgId: string, journeyId: string, data: ApiStepCreate): Promise<ApiStepAdminRead> {
    return apiClient.post<ApiStepAdminRead>(`/journeys/${orgId}/admin/journeys/${journeyId}/steps`, data);
  }

  async updateStep(orgId: string, journeyId: string, stepId: string, data: ApiStepUpdate): Promise<ApiStepAdminRead> {
    return apiClient.patch<ApiStepAdminRead>(`/journeys/${orgId}/admin/journeys/${journeyId}/steps/${stepId}`, data);
  }

  async deleteStep(orgId: string, journeyId: string, stepId: string): Promise<void> {
    await apiClient.delete(`/journeys/${orgId}/admin/journeys/${journeyId}/steps/${stepId}`);
  }

  async reorderSteps(orgId: string, journeyId: string, data: ApiStepReorderRequest): Promise<ApiStepAdminRead[]> {
    return apiClient.post<ApiStepAdminRead[]>(`/journeys/${orgId}/admin/journeys/${journeyId}/steps/reorder`, data);
  }
}

export const adminService = new AdminService();
