import { Journey } from '@/types';
import { apiClient } from '@/lib/api-client';
import { ApiEnrollment, ApiJourney, ApiStepProgress, ApiJourneyRead, ApiEnrollmentResponse, ApiJourneyAdminRead, ApiStepAdminRead } from '@/types/api.types';
import { mapApiToJourney, mapApiJourneyToPreview } from '@/lib/mappers';

interface FetchJourneysResult {
  journeys: Journey[];
  enrollmentMap: Map<string, string>;
}

/** Shape returned by GET /journeys/enrollments/me/full */
interface FullEnrollment {
  id: string;
  user_id: string;
  journey_id: string;
  organization_id?: string;
  status: string;
  current_step_index: number;
  progress_percentage: number;
  started_at: string;
  completed_at?: string;
  journey: ApiJourney;
  steps_progress: ApiStepProgress[];
  completed_steps: number;
  total_steps: number;
}

class JourneyService {
  // For participants: fetch journeys via batch endpoint (1 request instead of N+1)
  async fetchJourneys(fallbackOrgId?: string): Promise<FetchJourneysResult> {
    const fullEnrollments = await apiClient.get<FullEnrollment[]>('/journeys/enrollments/me/full');

    const enrollmentMap = new Map<string, string>();
    const allJourneys: Journey[] = [];

    for (const entry of fullEnrollments) {
      enrollmentMap.set(entry.journey_id, entry.id);

      // Build a lightweight enrollment object for the mapper
      const enrollment: ApiEnrollment = {
        id: entry.id,
        user_id: entry.user_id,
        journey_id: entry.journey_id,
        organization_id: entry.organization_id,
        status: entry.status,
        current_step_index: entry.current_step_index,
        progress_percentage: entry.progress_percentage,
        started_at: entry.started_at,
        completed_at: entry.completed_at,
      };

      const mapped = mapApiToJourney(enrollment, entry.journey, entry.steps_progress);
      allJourneys.push(mapped);
    }

    // Deduplicate by id
    const seen = new Set<string>();
    const journeys = allJourneys.filter(j => seen.has(j.id) ? false : (seen.add(j.id), true));

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

  async completeNode(enrollmentId: string, stepId: string, externalReference?: string): Promise<void> {
    const body: Record<string, unknown> = {};
    if (externalReference) {
      body.external_reference = externalReference;
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

  async enrollInJourneyWithEvent(journeyId: string, eventId: string): Promise<ApiEnrollmentResponse> {
    return apiClient.post<ApiEnrollmentResponse>('/journeys/enrollments/', {
      journey_id: journeyId,
      event_id: eventId,
    });
  }

  async updateEnrollmentEvent(journeyId: string, eventId: string): Promise<ApiEnrollmentResponse> {
    return apiClient.patch<ApiEnrollmentResponse>(`/journeys/enrollments/by-journey/${journeyId}/event`, {
      event_id: eventId,
    });
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
  async checkOnboarding(orgId?: string): Promise<{ should_show: boolean; journey_id: string | null }> {
    const params = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return apiClient.get<{ should_show: boolean; journey_id: string | null }>(`/journeys/me/onboarding-check${params}`);
  }
}

export const journeyService = new JourneyService();