import { apiClient } from '@/lib/api-client';
import {
  ApiOrganization,
  ApiOrgCreate,
  ApiOrgUpdate,
  ApiMemberResponse,
  ApiMemberUpdate,
  ApiMemberInvite,
} from '@/types/api.types';

class OrganizationService {
  // --- Organization CRUD ---

  async listMyOrganizations(): Promise<ApiOrganization[]> {
    return apiClient.get<ApiOrganization[]>('/auth/organizations');
  }

  async getOrganization(orgId: string): Promise<ApiOrganization> {
    return apiClient.get<ApiOrganization>(`/auth/organizations/${orgId}`);
  }

  async createOrganization(data: ApiOrgCreate): Promise<ApiOrganization> {
    return apiClient.post<ApiOrganization>('/auth/organizations', data);
  }

  async updateOrganization(orgId: string, data: ApiOrgUpdate): Promise<ApiOrganization> {
    return apiClient.patch<ApiOrganization>(`/auth/organizations/${orgId}`, data);
  }

  async deleteOrganization(orgId: string): Promise<void> {
    await apiClient.delete(`/auth/organizations/${orgId}`);
  }

  // --- Member Management ---

  async listMembers(orgId: string): Promise<ApiMemberResponse[]> {
    return apiClient.get<ApiMemberResponse[]>(`/auth/organizations/${orgId}/members`);
  }

  async inviteMember(orgId: string, data: ApiMemberInvite): Promise<ApiMemberResponse> {
    return apiClient.post<ApiMemberResponse>(`/auth/organizations/${orgId}/members`, data);
  }

  async updateMember(orgId: string, memberId: string, data: ApiMemberUpdate): Promise<ApiMemberResponse> {
    return apiClient.patch<ApiMemberResponse>(`/auth/organizations/${orgId}/members/${memberId}`, data);
  }

  async removeMember(orgId: string, memberId: string): Promise<void> {
    await apiClient.delete(`/auth/organizations/${orgId}/members/${memberId}`);
  }

  // --- User Admin ---

  async setPlatformAdmin(userId: string, isAdmin: boolean): Promise<void> {
    await apiClient.patch(`/auth/users/${userId}/admin`, { is_platform_admin: isAdmin });
  }
}

export const organizationService = new OrganizationService();
