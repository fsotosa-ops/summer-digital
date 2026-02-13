import { apiClient } from '@/lib/api-client';
import {
  ApiActivityRead,
  ApiGamificationConfigCreate,
  ApiGamificationConfigRead,
  ApiGamificationConfigUpdate,
  ApiLevelCreate,
  ApiLevelRead,
  ApiLevelUpdate,
  ApiRewardCreate,
  ApiRewardRead,
  ApiRewardUpdate,
  ApiUserPointsSummary,
  ApiUserRewardGrant,
  ApiUserRewardRead,
} from '@/types/api.types';

class GamificationService {
  // --- User Progress (org-scoped via query param) ---

  async getUserSummary(orgId?: string): Promise<ApiUserPointsSummary> {
    const params = orgId ? `?org_id=${orgId}` : '';
    return apiClient.get<ApiUserPointsSummary>(`/gamification/me/summary${params}`);
  }

  async getUserPoints(orgId?: string): Promise<number> {
    const params = orgId ? `?org_id=${orgId}` : '';
    return apiClient.get<number>(`/gamification/me/points${params}`);
  }

  async getUserRewards(): Promise<ApiUserRewardRead[]> {
    return apiClient.get<ApiUserRewardRead[]>('/gamification/me/rewards');
  }

  async getUserActivities(limit = 20, orgId?: string): Promise<ApiActivityRead[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (orgId) params.set('org_id', orgId);
    return apiClient.get<ApiActivityRead[]>(`/gamification/me/activities?${params}`);
  }

  // --- Admin: Levels ---

  async listLevels(orgId: string): Promise<ApiLevelRead[]> {
    return apiClient.get<ApiLevelRead[]>(`/gamification/${orgId}/admin/levels`);
  }

  async createLevel(orgId: string, data: ApiLevelCreate): Promise<ApiLevelRead> {
    return apiClient.post<ApiLevelRead>(`/gamification/${orgId}/admin/levels`, data);
  }

  async updateLevel(orgId: string, levelId: string, data: ApiLevelUpdate): Promise<ApiLevelRead> {
    return apiClient.patch<ApiLevelRead>(`/gamification/${orgId}/admin/levels/${levelId}`, data);
  }

  async deleteLevel(orgId: string, levelId: string): Promise<void> {
    await apiClient.delete(`/gamification/${orgId}/admin/levels/${levelId}`);
  }

  // --- Admin: Rewards Catalog ---

  async listRewards(orgId: string): Promise<ApiRewardRead[]> {
    return apiClient.get<ApiRewardRead[]>(`/gamification/${orgId}/admin/rewards`);
  }

  async createReward(orgId: string, data: ApiRewardCreate): Promise<ApiRewardRead> {
    return apiClient.post<ApiRewardRead>(`/gamification/${orgId}/admin/rewards`, data);
  }

  async updateReward(orgId: string, rewardId: string, data: ApiRewardUpdate): Promise<ApiRewardRead> {
    return apiClient.patch<ApiRewardRead>(`/gamification/${orgId}/admin/rewards/${rewardId}`, data);
  }

  async deleteReward(orgId: string, rewardId: string): Promise<void> {
    await apiClient.delete(`/gamification/${orgId}/admin/rewards/${rewardId}`);
  }

  // --- Admin: User Rewards ---

  async grantReward(orgId: string, data: ApiUserRewardGrant): Promise<ApiUserRewardRead> {
    return apiClient.post<ApiUserRewardRead>(`/gamification/${orgId}/admin/user-rewards`, data);
  }

  async revokeReward(orgId: string, userRewardId: string): Promise<void> {
    await apiClient.delete(`/gamification/${orgId}/admin/user-rewards/${userRewardId}`);
  }

  async getUserRewardsAdmin(orgId: string, userId: string): Promise<ApiUserRewardRead[]> {
    return apiClient.get<ApiUserRewardRead[]>(`/gamification/${orgId}/admin/user-rewards/${userId}`);
  }

  // --- Admin: Gamification Config ---

  async getConfig(orgId: string): Promise<ApiGamificationConfigRead | null> {
    return apiClient.get<ApiGamificationConfigRead | null>(`/gamification/${orgId}/admin/config`);
  }

  async upsertConfig(orgId: string, data: ApiGamificationConfigCreate): Promise<ApiGamificationConfigRead> {
    return apiClient.put<ApiGamificationConfigRead>(`/gamification/${orgId}/admin/config`, data);
  }

  async updateConfig(orgId: string, data: ApiGamificationConfigUpdate): Promise<ApiGamificationConfigRead> {
    return apiClient.patch<ApiGamificationConfigRead>(`/gamification/${orgId}/admin/config`, data);
  }
}

export const gamificationService = new GamificationService();
