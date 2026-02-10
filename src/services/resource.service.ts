import { apiClient } from '@/lib/api-client';
import {
  ApiConsumptionCreate,
  ApiConsumptionRead,
  ApiResourceAdminRead,
  ApiResourceCreate,
  ApiResourceOrganizationsResponse,
  ApiResourceParticipantRead,
  ApiResourceUpdate,
} from '@/types/api.types';

class ResourceService {
  // --- Admin: Resources CRUD ---

  async listResources(orgId: string, isPublished?: boolean | null): Promise<ApiResourceAdminRead[]> {
    const params = isPublished !== null && isPublished !== undefined ? `?is_published=${isPublished}` : '';
    return apiClient.get<ApiResourceAdminRead[]>(`/resources/${orgId}/admin/resources${params}`);
  }

  async getResource(orgId: string, id: string): Promise<ApiResourceAdminRead> {
    return apiClient.get<ApiResourceAdminRead>(`/resources/${orgId}/admin/resources/${id}`);
  }

  async createResource(orgId: string, data: ApiResourceCreate): Promise<ApiResourceAdminRead> {
    return apiClient.post<ApiResourceAdminRead>(`/resources/${orgId}/admin/resources`, data);
  }

  async updateResource(orgId: string, id: string, data: ApiResourceUpdate): Promise<ApiResourceAdminRead> {
    return apiClient.patch<ApiResourceAdminRead>(`/resources/${orgId}/admin/resources/${id}`, data);
  }

  async deleteResource(orgId: string, id: string): Promise<void> {
    await apiClient.delete(`/resources/${orgId}/admin/resources/${id}`);
  }

  async publishResource(orgId: string, id: string): Promise<ApiResourceAdminRead> {
    return apiClient.post<ApiResourceAdminRead>(`/resources/${orgId}/admin/resources/${id}/publish`, {});
  }

  async unpublishResource(orgId: string, id: string): Promise<ApiResourceAdminRead> {
    return apiClient.post<ApiResourceAdminRead>(`/resources/${orgId}/admin/resources/${id}/unpublish`, {});
  }

  async uploadFile(orgId: string, id: string, file: File): Promise<ApiResourceAdminRead> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResourceAdminRead>(`/resources/${orgId}/admin/resources/${id}/upload`, formData);
  }

  // --- Admin: Organization assignment ---

  async getResourceOrganizations(id: string): Promise<ApiResourceOrganizationsResponse> {
    return apiClient.get<ApiResourceOrganizationsResponse>(`/resources/admin/resources/${id}/organizations`);
  }

  async assignResourceOrganizations(id: string, orgIds: string[]): Promise<ApiResourceOrganizationsResponse> {
    return apiClient.post<ApiResourceOrganizationsResponse>(
      `/resources/admin/resources/${id}/organizations`,
      { organization_ids: orgIds }
    );
  }

  async unassignResourceOrganizations(id: string, orgIds: string[]): Promise<ApiResourceOrganizationsResponse> {
    return apiClient.delete<ApiResourceOrganizationsResponse>(
      `/resources/admin/resources/${id}/organizations`,
      { organization_ids: orgIds }
    );
  }

  // --- Participant ---

  async getMyResources(): Promise<ApiResourceParticipantRead[]> {
    return apiClient.get<ApiResourceParticipantRead[]>('/resources/me/resources');
  }

  async getMyResource(id: string): Promise<ApiResourceParticipantRead> {
    return apiClient.get<ApiResourceParticipantRead>(`/resources/me/resources/${id}`);
  }

  async openResource(id: string): Promise<ApiConsumptionRead> {
    return apiClient.post<ApiConsumptionRead>(`/resources/me/resources/${id}/open`, {});
  }

  async completeResource(id: string, data?: ApiConsumptionCreate): Promise<ApiConsumptionRead> {
    return apiClient.post<ApiConsumptionRead>(`/resources/me/resources/${id}/complete`, data || {});
  }
}

export const resourceService = new ResourceService();
