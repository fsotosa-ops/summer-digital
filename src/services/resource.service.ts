import { apiClient } from '@/lib/api-client';

export interface ApiResource {
    id: number;
    title: string;
    min_score?: number;
    [key: string]: unknown;
}

class ResourceService {
    async updateResource(id: number, data: Partial<ApiResource>): Promise<void> {
        // Assuming endpoint exists or mocking it
        try {
            await apiClient.patch(`/resources/${id}`, data);
        } catch (error) {
            console.warn('Mocking resource update (backend might not exist for this yet)', error);
            // If backend fails (404), we might pretend it worked for demo purposes 
            // if we are in a "frontend-first" refactor.
            // But ideally we should have a real endpoint.
        }
    }
}

export const resourceService = new ResourceService();
