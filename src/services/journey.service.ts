import { Journey } from '@/types';
import { apiClient } from '@/lib/api-client';
import { ApiEnrollment, ApiJourney, ApiStepProgress, ApiJourneyRead, ApiEnrollmentResponse, ApiJourneyAdminRead, ApiStepAdminRead } from '@/types/api.types';
import { mapApiToJourney, mapApiJourneyToPreview } from '@/lib/mappers';

interface FetchJourneysResult {
  journeys: Journey[];
  enrollmentMap: Map<string, string>;
}

class JourneyService {
  // For participants: fetch journeys based on their enrollments
  async fetchJourneys(fallbackOrgId?: string): Promise<FetchJourneysResult> {
    const enrollments = await apiClient.get<ApiEnrollment[]>('/journeys/enrollments/me');

    const enrollmentMap = new Map<string, string>();
    const journeyPromises = enrollments.map(async (enrollment) => {
      // Use org from enrollment (joined from journey), fallback to provided orgId
      const orgId = enrollment.organization_id || fallbackOrgId;
      if (!orgId) return null;

      enrollmentMap.set(enrollment.journey_id, enrollment.id);

      const [journey, stepsProgress] = await Promise.all([
        apiClient.get<ApiJourney>(`/journeys/${orgId}/journeys/${enrollment.journey_id}`),
        apiClient.get<ApiStepProgress[]>(`/journeys/enrollments/${enrollment.id}/progress`),
      ]);

      return mapApiToJourney(enrollment, journey, stepsProgress);
    });

    const results = await Promise.all(journeyPromises);
    const journeys = results.filter((j): j is Journey => j !== null);

    return { journeys, enrollmentMap };
  }

  // For SuperAdmin: fetch all journeys from an org (preview mode, no enrollment)
  async fetchJourneysForAdmin(orgId: string): Promise<Journey[]> {
    const journeysList = await apiClient.get<ApiJourneyRead[]>(`/journeys/${orgId}/journeys`);

    // For each journey, fetch full details with steps
    const journeyPromises = journeysList.map(async (journeyRead) => {
      const journey = await apiClient.get<ApiJourney>(`/journeys/${orgId}/journeys/${journeyRead.id}`);
      return mapApiJourneyToPreview(journey);
    });

    return Promise.all(journeyPromises);
  }

  async completeNode(enrollmentId: string, stepId: string, externalReference?: string, metadata?: Record<string, unknown>): Promise<void> {
    const body: Record<string, unknown> = {};
    if (externalReference) {
      body.external_reference = externalReference;
    }
    if (metadata) {
      body.metadata = metadata;
    }
    await apiClient.post(`/journeys/enrollments/${enrollmentId}/steps/${stepId}/complete`, body);
  }

  async listAvailableJourneys(orgId: string): Promise<ApiJourneyRead[]> {
    return apiClient.get<ApiJourneyRead[]>(`/journeys/${orgId}/journeys`);
  }

  async listAvailableJourneysMultiOrg(orgIds: string[]): Promise<ApiJourneyRead[]> {
    const results = await Promise.all(
      orgIds.map(orgId =>
        apiClient.get<ApiJourneyRead[]>(`/journeys/${orgId}/journeys`).catch(() => [] as ApiJourneyRead[])
      )
    );
    // Deduplicate by journey id
    const seen = new Set<string>();
    const merged: ApiJourneyRead[] = [];
    for (const list of results) {
      for (const j of list) {
        if (!seen.has(j.id)) {
          seen.add(j.id);
          merged.push(j);
        }
      }
    }
    return merged;
  }

  async enrollInJourney(journeyId: string): Promise<ApiEnrollmentResponse> {
    return apiClient.post<ApiEnrollmentResponse>('/journeys/enrollments/', { journey_id: journeyId });
  }

  async getMyEnrollments(): Promise<ApiEnrollment[]> {
    return apiClient.get<ApiEnrollment[]>('/journeys/enrollments/me');
  }

  // Admin: list all journeys for an org
  async listAdminJourneys(orgId: string): Promise<ApiJourneyAdminRead[]> {
    return apiClient.get<ApiJourneyAdminRead[]>(`/journeys/${orgId}/admin/journeys`);
  }

  // Admin: list steps of a specific journey
  async listAdminSteps(orgId: string, journeyId: string): Promise<ApiStepAdminRead[]> {
    return apiClient.get<ApiStepAdminRead[]>(`/journeys/${orgId}/admin/journeys/${journeyId}/steps`);
  }

  // Check whether the participant should see the onboarding journey gate
  async checkOnboarding(): Promise<{ should_show: boolean; journey_id: string | null }> {
    return apiClient.get<{ should_show: boolean; journey_id: string | null }>('/journeys/me/onboarding-check');
  }
}

export const journeyService = new JourneyService();