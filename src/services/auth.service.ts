import { User } from '@/types';
import { apiClient } from '@/lib/api-client';
import { ApiLoginResponse, ApiUser, ApiOAuthUrlResponse } from '@/types/api.types';
import { mapApiUserToUser } from '@/lib/mappers';

class AuthService {
  async login(email: string, password: string): Promise<User> {
    const response = await apiClient.post<ApiLoginResponse>('/auth/login', { email, password });
    apiClient.setTokens(response.access_token, response.refresh_token);
    return mapApiUserToUser(response.user);
  }

  async register(email: string, password: string, fullName?: string): Promise<void> {
    await apiClient.post('/auth/register', {
      email,
      password,
      full_name: fullName || null,
    });
  }

  async requestPasswordRecovery(email: string): Promise<void> {
    await apiClient.post('/auth/password/recovery', { email });
  }

  async getGoogleOAuthUrl(redirectTo: string): Promise<string> {
    const response = await apiClient.get<ApiOAuthUrlResponse>(
      `/auth/login/oauth?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`
    );
    return response.url;
  }

  async handleOAuthCallback(code: string): Promise<User> {
    const response = await apiClient.get<ApiLoginResponse>(`/auth/callback?code=${code}`);
    apiClient.setTokens(response.access_token, response.refresh_token);
    return mapApiUserToUser(response.user);
  }

  async getUserProfile(): Promise<User> {
    const apiUser = await apiClient.get<ApiUser>('/auth/users/me');
    return mapApiUserToUser(apiUser);
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // Ignore errors on logout - we'll clear tokens anyway
    } finally {
      apiClient.clearTokens();
    }
  }

  async updateMyProfile(data: { full_name?: string }): Promise<User> {
    const apiUser = await apiClient.patch<ApiUser>('/auth/users/me', data);
    return mapApiUserToUser(apiUser);
  }

  async refreshSession(): Promise<User | null> {
    try {
      const apiUser = await apiClient.get<ApiUser>('/auth/users/me');
      return mapApiUserToUser(apiUser);
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
