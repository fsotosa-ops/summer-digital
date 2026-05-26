import { apiClient } from '@/lib/api-client';
import { ApiPlatformSettings, ApiPlatformSettingsUpdate } from '@/types/api.types';

class SettingsService {
  async getPlatformSettings(): Promise<ApiPlatformSettings> {
    return apiClient.get<ApiPlatformSettings>('/auth/settings');
  }

  async updatePlatformSettings(data: ApiPlatformSettingsUpdate): Promise<ApiPlatformSettings> {
    return apiClient.patch<ApiPlatformSettings>('/auth/settings', data);
  }
}

export const settingsService = new SettingsService();
