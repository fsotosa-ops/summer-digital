export const EventType = {
  JOURNEY_ARCHIVED: 'journey.archived',
  JOURNEY_PUBLISHED: 'journey.published',
} as const

export type EventTypeName = (typeof EventType)[keyof typeof EventType]

export interface RealtimeEvent<T = Record<string, unknown>> {
  type: string
  payload: T
  org_id: string | null
  timestamp: string
}
