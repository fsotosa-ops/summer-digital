import { create } from 'zustand';
import { Journey } from '@/types';
import { journeyService } from '@/services/journey.service';
import { useAuthStore } from './useAuthStore';

interface JourneyState {
  journeys: Journey[];
  selectedJourneyId: string | null;
  isLoading: boolean;
  enrollmentMap: Map<string, string>;
  // For SuperAdmin: track which org we're viewing
  viewingOrgId: string | null;
  isPreviewMode: boolean;
  fetchJourneys: (orgIdOverride?: string) => Promise<void>;
  fetchJourneysForAdmin: (orgId: string) => Promise<void>;
  selectJourney: (id: string | null) => void;
  completeActivity: (nodeId: string, externalReference?: string, metadata?: Record<string, unknown>) => Promise<void>;
  setViewingOrgId: (orgId: string | null) => void;
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  journeys: [],
  selectedJourneyId: null,
  isLoading: false,
  enrollmentMap: new Map(),
  viewingOrgId: null,
  isPreviewMode: false,

  // For participants: fetch based on enrollments (multi-org aware)
  fetchJourneys: async (fallbackOrgId?: string) => {
    const user = useAuthStore.getState().user;
    const orgId = fallbackOrgId || user?.organizationId;

    set({ isLoading: true, isPreviewMode: false });
    try {
      const { journeys, enrollmentMap } = await journeyService.fetchJourneys(orgId);
      set({ journeys, enrollmentMap });
    } catch (error) {
      console.error('Error fetching journeys:', error);
      set({ journeys: [], enrollmentMap: new Map() });
    } finally {
      set({ isLoading: false });
    }
  },

  // For SuperAdmin: fetch all journeys from org (preview mode)
  fetchJourneysForAdmin: async (orgId: string) => {
    set({ isLoading: true, viewingOrgId: orgId, isPreviewMode: true });
    try {
      const journeys = await journeyService.fetchJourneysForAdmin(orgId);
      set({ journeys, enrollmentMap: new Map() });
    } catch (error) {
      console.error('Error fetching journeys for admin:', error);
      set({ journeys: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  setViewingOrgId: (orgId) => {
    set({ viewingOrgId: orgId });
  },

  selectJourney: (id) => {
    set({ selectedJourneyId: id });
  },

  completeActivity: async (nodeId: string, externalReference?: string, metadata?: Record<string, unknown>) => {
    const { journeys, selectedJourneyId, enrollmentMap, isPreviewMode } = get();
    if (!selectedJourneyId) return;

    // In preview mode (SuperAdmin), don't actually complete anything
    if (isPreviewMode) {
      console.log('Preview mode: activity completion simulated');
      return;
    }

    const enrollmentId = enrollmentMap.get(selectedJourneyId);
    if (!enrollmentId) return;

    await journeyService.completeNode(enrollmentId, nodeId, externalReference, metadata);

    // Points are now handled by the backend trigger (handle_step_completion)
    // No need to manually add points in frontend

    const updatedJourneys = journeys.map(journey => {
      if (journey.id !== selectedJourneyId) return journey;

      let nextNodeId: string | undefined;
      let completedNodesCount = 0;

      const updatedNodes = journey.nodes.map(node => {
        if (node.id === nodeId) {
          if (node.connections.length > 0) {
            nextNodeId = node.connections[0];
          }
          return { ...node, status: 'completed' as const };
        }
        return node;
      });

      const finalNodes = updatedNodes.map(node => {
        if (node.status === 'completed') completedNodesCount++;
        if (nextNodeId && node.id === nextNodeId && node.status === 'locked') {
          return { ...node, status: 'available' as const };
        }
        return node;
      });

      const progress = Math.round((completedNodesCount / finalNodes.length) * 100);

      let status = journey.status;
      if (progress === 100 && status !== 'completed') {
        status = 'completed';
      }

      return { ...journey, nodes: finalNodes, progress, status };
    });

    set({ journeys: updatedJourneys });
  },
}));