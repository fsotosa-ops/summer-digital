import { apiClient } from '@/lib/api-client';

class AnalyticsService {
  async getGuestToken(): Promise<string> {
    const response = await apiClient.post<{ token: string }>(
      '/analytics/guest-token',
      {},
    );
    return response.token;
  }
}

export const analyticsService = new AnalyticsService();
