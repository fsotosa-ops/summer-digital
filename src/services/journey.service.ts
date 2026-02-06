import { Journey } from '@/types';
import { apiClient } from '@/lib/api-client';
import { ApiEnrollment, ApiJourney, ApiStepProgress, ApiJourneyRead, ApiEnrollmentResponse } from '@/types/api.types';
import { mapApiToJourney, mapApiJourneyToPreview } from '@/lib/mappers';

interface FetchJourneysResult {
  journeys: Journey[];
  enrollmentMap: Map<string, string>;
}

class JourneyService {
  // For participants: fetch journeys based on their enrollments
  async fetchJourneys(orgId: string): Promise<FetchJourneysResult> {
    const enrollments = await apiClient.get<ApiEnrollment[]>('/journeys/enrollments/me');

    const enrollmentMap = new Map<string, string>();
    const journeyPromises = enrollments.map(async (enrollment) => {
      enrollmentMap.set(enrollment.journey_id, enrollment.id);

      const [journey, stepsProgress] = await Promise.all([
        apiClient.get<ApiJourney>(`/journeys/${orgId}/journeys/${enrollment.journey_id}`),
        apiClient.get<ApiStepProgress[]>(`/journeys/enrollments/${enrollment.id}/progress`),
      ]);

      return mapApiToJourney(enrollment, journey, stepsProgress);
    });

    const journeys = await Promise.all(journeyPromises);

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

  async completeNode(enrollmentId: string, stepId: string): Promise<void> {
    await apiClient.post(`/journeys/enrollments/${enrollmentId}/steps/${stepId}/complete`, {});
  }

  async listAvailableJourneys(orgId: string): Promise<ApiJourneyRead[]> {
    return apiClient.get<ApiJourneyRead[]>(`/journeys/${orgId}/journeys`);
  }

  async enrollInJourney(journeyId: string): Promise<ApiEnrollmentResponse> {
    return apiClient.post<ApiEnrollmentResponse>('/journeys/enrollments/', { journey_id: journeyId });
  }

  async getMyEnrollments(): Promise<ApiEnrollment[]> {
    return apiClient.get<ApiEnrollment[]>('/journeys/enrollments/me');
  }
}

export const journeyService = new JourneyService();
