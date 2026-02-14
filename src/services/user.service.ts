import { apiClient } from '@/lib/api-client';
import {
  ApiAdminUserUpdate,
  ApiPaginatedUsersResponse,
  ApiUser,
} from '@/types/api.types';

class UserService {
  async getUser(userId: string): Promise<ApiUser> {
    return apiClient.get<ApiUser>(`/auth/users/${userId}`);
  }

  async listUsers(
    offset: number = 0,
    limit: number = 50,
    search?: string,
  ): Promise<ApiPaginatedUsersResponse> {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    });
    if (search) {
      params.set('search', search);
    }
    return apiClient.get<ApiPaginatedUsersResponse>(
      `/auth/users/?${params.toString()}`, 
    );
  }

  async updateUser(userId: string, data: ApiAdminUserUpdate): Promise<ApiUser> {
    return apiClient.patch<ApiUser>(`/auth/users/${userId}`, data);
  }

  async togglePlatformAdmin(
    userId: string,
    isAdmin: boolean,
  ): Promise<ApiUser> {
    return apiClient.patch<ApiUser>(`/auth/users/${userId}/admin`, {
      is_platform_admin: isAdmin,
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/auth/users/${userId}`);
  }
}

export const userService = new UserService();
