import { useEffect, useRef } from 'react'

import { realtimeClient } from '@/lib/realtime/client'

/**
 * Subscribe to a realtime event type for the lifetime of the component.
 *
 * The handler is stabilised via a ref so its identity never triggers
 * re-subscriptions — callers don't need to memoize it.
 *
 * @param eventType  e.g. 'journey.archived' — use EventType constants
 * @param handler    called with the event payload when the event arrives
 */
export function useRealtimeEvents<T = unknown>(
  eventType: string,
  handler: (payload: T) => void,
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const stable = (payload: T) => handlerRef.current(payload)
    return realtimeClient.on<T>(eventType, stable)
  }, [eventType])
}
