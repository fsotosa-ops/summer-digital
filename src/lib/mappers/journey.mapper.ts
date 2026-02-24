import { Journey, JourneyNode, NodeType, NodeStatus } from '@/types';
import { ApiEnrollment, ApiJourney, ApiJourneyAdminRead, ApiStepAdminRead, ApiStepProgress, ApiStepType } from '@/types/api.types';
import { detectAndResolveUrl } from '@/lib/url-detection';

const STEP_TYPE_TO_NODE_TYPE: Record<ApiStepType, NodeType> = {
  survey: 'typeform',
  event_attendance: 'workshop',
  content_view: 'video',
  milestone: 'challenge',
  social_interaction: 'feedback',
  resource_consumption: 'article',
};

const VALID_NODE_TYPES: NodeType[] = ['video', 'quiz', 'workshop', 'article', 'challenge', 'typeform', 'feedback', 'pdf', 'presentation', 'kahoot'];

const RESOURCE_TYPE_TO_NODE_TYPE: Record<string, NodeType> = {
  youtube: 'video',
  vimeo: 'video',
  google_slides: 'presentation',
  google_drive_pdf: 'pdf',
  pdf: 'pdf',
  kahoot: 'kahoot',
  typeform: 'typeform',
  generic_link: 'article',
};

function mapStepTypeToNodeType(stepType: ApiStepType, config?: Record<string, unknown>): NodeType {
  // Check config.resource.type first (new format)
  const resource = config?.resource as Record<string, unknown> | undefined;
  if (resource?.type && RESOURCE_TYPE_TO_NODE_TYPE[resource.type as string]) {
    return RESOURCE_TYPE_TO_NODE_TYPE[resource.type as string];
  }
  if (config?.frontend_type && VALID_NODE_TYPES.includes(config.frontend_type as NodeType)) {
    return config.frontend_type as NodeType;
  }
  return STEP_TYPE_TO_NODE_TYPE[stepType] || 'article';
}

function extractEmbedUrl(config: Record<string, unknown>): string | undefined {
  const resource = config.resource as Record<string, unknown> | undefined;
  if (resource?.embed_url) return resource.embed_url as string;
  // Legacy fallback: convert raw URLs to proper embed URLs
  const legacyUrl = (config.embed_url as string) || (config.video_url as string) || (config.form_url as string) || (config.url as string);
  if (legacyUrl) {
    const detected = detectAndResolveUrl(legacyUrl);
    return detected?.embedUrl || legacyUrl;
  }
  return undefined;
}

function mapStepStatusToNodeStatus(status: string): NodeStatus {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'available':
      return 'available';
    case 'locked':
    default:
      return 'locked';
  }
}

function generateCoordinates(index: number, total: number): { x: number; y: number } {
  const xStart = 10;
  const xEnd = 90;
  const xStep = total > 1 ? (xEnd - xStart) / (total - 1) : 0;
  const x = total === 1 ? 50 : xStart + xStep * index;

  const yPattern = [50, 35, 65];
  const y = total <= 3 ? 50 : yPattern[index % yPattern.length];

  return { x, y };
}

export function mapApiToJourney(
  enrollment: ApiEnrollment,
  journey: ApiJourney,
  stepsProgress: ApiStepProgress[]
): Journey {
  const sortedProgress = [...stepsProgress].sort((a, b) => a.order_index - b.order_index);
  const total = sortedProgress.length;

  const nodes: JourneyNode[] = sortedProgress.map((stepProgress, index) => {
    const stepFromJourney = journey.steps?.find(s => s.id === stepProgress.step_id);
    const config = stepFromJourney?.config || {};
    const nodeType = mapStepTypeToNodeType(stepProgress.type as ApiStepType, config);
    const { x, y } = generateCoordinates(index, total);

    const connections: string[] = index < total - 1 ? [sortedProgress[index + 1].step_id] : [];

    const description = (config.description as string) || stepProgress.title;
    const embedUrl = extractEmbedUrl(config);
    const externalUrl = (config.url as string) || (config.form_url as string) || undefined;
    const videoUrl = (config.video_url as string) || undefined;
    const isCompleted = stepProgress.status === 'completed';
    const isVideoType = nodeType === 'video';

    const basePoints = (stepFromJourney?.gamification_rules?.base_points as number) || 0;

    return {
      id: stepProgress.step_id,
      title: stepProgress.title,
      description,
      type: nodeType,
      status: mapStepStatusToNodeStatus(stepProgress.status),
      x,
      y,
      connections,
      externalUrl,
      videoUrl,
      embedUrl,
      videoWatched: isVideoType && isCompleted ? true : undefined,
      points: basePoints || undefined,
    };
  });

  return {
    id: journey.id,
    title: journey.title,
    description: journey.description || '',
    status: enrollment.status === 'completed' ? 'completed' : 'active',
    category: journey.category || undefined,
    progress: enrollment.progress_percentage,
    nodes,
  };
}

// For admin preview: transforms admin data to participant-like Journey for preview simulation
export function mapAdminDataToPreviewJourney(
  journey: ApiJourneyAdminRead,
  steps: ApiStepAdminRead[]
): Journey {
  const sortedSteps = [...steps].sort((a, b) => a.order_index - b.order_index);
  const total = sortedSteps.length;

  const nodes: JourneyNode[] = sortedSteps.map((step, index) => {
    const config = step.config || {};
    const nodeType = mapStepTypeToNodeType(step.type, config);
    const { x, y } = generateCoordinates(index, total);

    const connections: string[] = index < total - 1 ? [sortedSteps[index + 1].id] : [];

    const description = (config.description as string) || step.title;
    const embedUrl = extractEmbedUrl(config);
    const externalUrl = (config.url as string) || (config.form_url as string) || undefined;
    const videoUrl = (config.video_url as string) || undefined;

    return {
      id: step.id,
      title: step.title,
      description,
      type: nodeType,
      status: index === 0 ? 'available' : 'locked' as NodeStatus,
      x,
      y,
      connections,
      externalUrl,
      videoUrl,
      embedUrl,
    };
  });

  return {
    id: journey.id,
    title: journey.title,
    description: journey.description || '',
    status: 'active',
    category: journey.category || undefined,
    progress: 0,
    nodes,
  };
}

// For SuperAdmin: Preview mode (all nodes available, no enrollment tracking)
export function mapApiJourneyToPreview(journey: ApiJourney): Journey {
  const steps = journey.steps || [];
  const sortedSteps = [...steps].sort((a, b) => a.order_index - b.order_index);
  const total = sortedSteps.length;

  const nodes: JourneyNode[] = sortedSteps.map((step, index) => {
    const config = step.config || {};
    const nodeType = mapStepTypeToNodeType(step.type, config);
    const { x, y } = generateCoordinates(index, total);

    const connections: string[] = index < total - 1 ? [sortedSteps[index + 1].id] : [];

    const description = (config.description as string) || step.title;
    const embedUrl = extractEmbedUrl(config);
    const externalUrl = (config.url as string) || (config.form_url as string) || undefined;
    const videoUrl = (config.video_url as string) || undefined;

    return {
      id: step.id,
      title: step.title,
      description,
      type: nodeType,
      status: index === 0 ? 'available' : 'locked', // First node available, rest locked (preview mode)
      x,
      y,
      connections,
      externalUrl,
      videoUrl,
      embedUrl,
    };
  });

  return {
    id: journey.id,
    title: journey.title,
    description: journey.description || '',
    status: journey.is_active ? 'active' : 'active', // Preview always shows as active
    category: journey.category || undefined,
    progress: 0, // No progress in preview mode
    nodes,
  };
}
