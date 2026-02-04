import { create } from 'zustand';
import { Journey } from '@/types';
import { journeyService } from '@/services/journey.service';
import { useAuthStore } from './useAuthStore';

interface JourneyState {
  journeys: Journey[];
  selectedJourneyId: string | null;
  isLoading: boolean;
  fetchJourneys: () => Promise<void>;
  selectJourney: (id: string | null) => void;
  completeActivity: (nodeId: string) => Promise<void>;
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  journeys: [],
  selectedJourneyId: null,
  isLoading: false,

  fetchJourneys: async () => {
    set({ isLoading: true });
    try {
      const journeys = await journeyService.fetchJourneys();
      set({ journeys });
    } finally {
      set({ isLoading: false });
    }
  },

  selectJourney: (id) => {
      set({ selectedJourneyId: id });
  },

  completeActivity: async (nodeId: string) => {
    const { journeys, selectedJourneyId } = get();
    if (!selectedJourneyId) return;

    await journeyService.completeNode(nodeId);
    
    // Add points
    useAuthStore.getState().addPoints(5);

    const updatedJourneys = journeys.map(journey => {
        if (journey.id !== selectedJourneyId) return journey;

        // Current Journey Logic
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
        
        // Recalculate progress
        const progress = Math.round((completedNodesCount / finalNodes.length) * 100);
        
        // Check for journey completion (simple check: if progress 100 or last node completed)
        // Ideally we check if the completed node was a leaf node or if all nodes are completed.
        // For now, let's use progress === 100 as the trigger if we assume linear.
        // Or better: if nextNodeId is undefined and node was completed, it might be the end.
        
        let status = journey.status;
        if (progress === 100 && status !== 'completed') {
            status = 'completed';
            // Here we could trigger a celebration flag in a local UI state or return something
        }

        return { ...journey, nodes: finalNodes, progress, status };
    });

    set({ journeys: updatedJourneys });
  },
}));
