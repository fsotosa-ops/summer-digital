/**
 * Singleton WebSocket client for real-time event streaming.
 *
 * Usage:
 *   realtimeClient.connect()        — call once when user authenticates
 *   realtimeClient.disconnect()     — call on logout
 *   realtimeClient.on(type, fn)     — subscribe; returns unsubscribe fn
 */

import { supabase } from '@/lib/supabase'

type EventHandler<T = unknown> = (payload: T) => void

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''
const WS_BASE = API_URL.replace(/^https/, 'wss').replace(/^http/, 'ws')

const PING_INTERVAL_MS = 30_000   // Must be < server _PING_WINDOW (35s)
const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000

class RealtimeClient {
  private ws: WebSocket | null = null
  private listeners = new Map<string, Set<EventHandler>>()
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private backoffMs = INITIAL_BACKOFF_MS
  private shouldConnect = false

  /** Start the connection. Safe to call multiple times. */
  connect(): void {
    this.shouldConnect = true
    void this._open()
  }

  /** Stop the connection and cancel any pending reconnect. */
  disconnect(): void {
    this.shouldConnect = false
    this._clearTimers()
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
  }

  /**
   * Subscribe to an event type.
   * Returns an unsubscribe function — call it in useEffect cleanup.
   */
  on<T = unknown>(type: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler as EventHandler)
    return () => {
      this.listeners.get(type)?.delete(handler as EventHandler)
    }
  }

  private async _open(): Promise<void> {
    if (!this.shouldConnect) return
    if (this.ws?.readyState === WebSocket.OPEN) return

    if (!WS_BASE) {
      console.warn('[Realtime] NEXT_PUBLIC_API_URL not set — skipping WS')
      return
    }

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      // Not authenticated yet — will retry after login triggers connect()
      return
    }

    try {
      this.ws = new WebSocket(`${WS_BASE}/api/v1/ws?token=${token}`)

      this.ws.onopen = () => {
        this.backoffMs = INITIAL_BACKOFF_MS
        this._startPing()
      }

      this.ws.onmessage = ({ data: raw }) => {
        if (raw === 'pong') return
        try {
          const event = JSON.parse(raw as string)
          this._emit(event.type, event.payload)
        } catch {
          // Ignore malformed frames
        }
      }

      this.ws.onclose = ({ code }) => {
        this._clearTimers()
        // 1000 = clean close, 4001 = auth rejected — don't reconnect
        if (this.shouldConnect && code !== 1000 && code !== 4001) {
          this._scheduleReconnect()
        }
      }

      this.ws.onerror = () => {
        // onclose fires immediately after — reconnect is handled there
      }
    } catch {
      this._scheduleReconnect()
    }
  }

  private _startPing(): void {
    this._clearTimers()
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping')
      }
    }, PING_INTERVAL_MS)
  }

  private _scheduleReconnect(): void {
    const jitter = this.backoffMs * 0.2 * (Math.random() * 2 - 1)
    const delay = Math.round(this.backoffMs + jitter)
    this.reconnectTimer = setTimeout(() => void this._open(), delay)
    this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS)
  }

  private _clearTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private _emit(type: string, payload: unknown): void {
    this.listeners.get(type)?.forEach((handler) => {
      try {
        handler(payload)
      } catch {
        // Isolate handler errors — one bad handler can't break others
      }
    })
  }
}

export const realtimeClient = new RealtimeClient()
