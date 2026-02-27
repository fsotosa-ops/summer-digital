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
  ApiRewardRead,
  ApiRewardUpdate,
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

  async createOnboardingTemplate(orgId: string): Promise<{ journey: ApiJourneyAdminRead; already_existed: boolean }> {
    return apiClient.post<{ journey: ApiJourneyAdminRead; already_existed: boolean }>(
      `/journeys/${orgId}/admin/journeys/templates/onboarding`,
      {},
    );
  }

  async applyOnboardingTemplateSteps(orgId: string, journeyId: string): Promise<{ steps_added: number }> {
    return apiClient.post<{ steps_added: number }>(
      `/journeys/${orgId}/admin/journeys/${journeyId}/templates/onboarding/steps`,
      {},
    );
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

  // --- Gamification Rewards ---

  async listRewards(orgId: string): Promise<ApiRewardRead[]> {
    return apiClient.get<ApiRewardRead[]>(`/gamification/${orgId}/admin/rewards`);
  }

  async updateReward(orgId: string, rewardId: string, data: ApiRewardUpdate): Promise<ApiRewardRead> {
    return apiClient.patch<ApiRewardRead>(`/gamification/${orgId}/admin/rewards/${rewardId}`, data);
  }

  // --- Gamification Config ---

  async getGamificationConfig(orgId: string): Promise<Record<string, unknown> | null> {
    return apiClient.get<Record<string, unknown> | null>(`/gamification/${orgId}/admin/config`);
  }

  async updateGamificationConfig(orgId: string, data: Record<string, unknown>): Promise<void> {
    await apiClient.patch(`/gamification/${orgId}/admin/config`, data);
  }
}

export const adminService = new AdminService();
