/**
 * Error personalizado para manejar respuestas de la API
 */
export class ApiError extends Error {
    status: number;
    statusText: string;
    data: any;

    constructor(status: number, statusText: string, data: any) {
      const backendMsg = data?.error?.message || data?.message;
      super(backendMsg || `API Error ${status}: ${statusText}`);
      this.name = 'ApiError';
      this.status = status;
      this.statusText = statusText;
      this.data = data;
    }
  }

  // ---------------------------------------------------------------------------
  // Retry / timeout config
  // ---------------------------------------------------------------------------
  const REQUEST_TIMEOUT_MS = 15_000;
  const MAX_RETRIES = 2;
  const RETRY_BASE_DELAY_MS = 300;
  const RETRYABLE_STATUS = new Set([502, 503, 504]);

  class ApiClient {
    private static instance: ApiClient;
    private baseUrl: string;

    // Tokens: Access en memoria, Refresh en localStorage (gestionado internamente)
    private accessToken: string | null = null;

    // Promesa de refresh para deduplicación (Singleton de la promesa)
    private refreshPromise: Promise<void> | null = null;

    // Circuit breaker: cuando auth falla irrecuperablemente, corta todas las requests
    private isAuthDead = false;
    private onAuthFailureCallback: (() => void) | null = null;

    private constructor() {
      this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    }

    /**
     * Endpoints públicos de auth que no requieren token.
     */
    private isPublicAuthEndpoint(endpoint: string): boolean {
      return endpoint.includes('/auth/login') ||
             endpoint.includes('/auth/register') ||
             endpoint.includes('/auth/refresh') ||
             endpoint.includes('/auth/callback') ||
             endpoint.includes('/auth/password/recovery');
    }

    public static getInstance(): ApiClient {
      if (!ApiClient.instance) {
        ApiClient.instance = new ApiClient();
      }
      return ApiClient.instance;
    }

    /**
     * Registra callback para fallo irrecuperable de auth.
     * Se invoca una sola vez por fallo (guarded por isAuthDead).
     */
    public onAuthFailure(callback: () => void) {
      this.onAuthFailureCallback = callback;
    }

    /**
     * Configura los tokens (llamado al hacer login o refresh exitoso)
     */
    public setTokens(accessToken: string, refreshToken: string) {
      this.accessToken = accessToken;
      this.isAuthDead = false; // Reset circuit breaker con tokens válidos
      // Guardamos el refresh token en localStorage por persistencia
      if (typeof window !== 'undefined') {
        localStorage.setItem('refresh_token', refreshToken);
      }
    }

    /**
     * Limpia los tokens y estado (llamado al hacer logout o error crítico)
     */
    public clearTokens() {
      this.accessToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('refresh_token');
      }
    }

    /**
     * Lógica central de deduplicación de refresh token.
     * Si varios requests fallan con 401 simultáneamente, solo uno ejecuta el refresh.
     */
    private async refreshAccessToken(): Promise<void> {
      // Si ya hay un refresh ocurriendo, devolvemos esa misma promesa
      if (this.refreshPromise) {
        return this.refreshPromise;
      }

      this.refreshPromise = (async () => {
        try {
          const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Hacemos el request de refresh "crudo" (sin usar this.request para evitar loops)
          const response = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!response.ok) {
            throw new ApiError(response.status, response.statusText, await response.json().catch(() => ({})));
          }

          const data = await response.json();

          // Asumimos que el backend devuelve { access_token, refresh_token }
          this.setTokens(data.access_token, data.refresh_token || refreshToken);

          // Sincronizar sesión Supabase para mantener Realtime activo
          try {
            const { syncSupabaseSession } = await import('@/lib/supabase');
            await syncSupabaseSession(data.access_token, data.refresh_token || refreshToken);
          } catch {
            // No bloquear el refresh si la sincronización de Supabase falla
          }

        } catch (error) {
          // Si el refresh falla, limpiamos tokens y activamos circuit breaker
          this.clearTokens();
          if (!this.isAuthDead) {
            this.isAuthDead = true;
            this.onAuthFailureCallback?.();
          }
          throw error;
        } finally {
          this.refreshPromise = null;
        }
      })();

      return this.refreshPromise;
    }

    /**
     * Execute a fetch with AbortController timeout.
     */
    private async fetchWithTimeout(url: string, config: RequestInit): Promise<Response> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        return await fetch(url, { ...config, signal: controller.signal });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new ApiError(0, 'Request timeout', { message: `Request to ${url} timed out after ${REQUEST_TIMEOUT_MS}ms` });
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    /**
     * Execute fetch with retry for transient server errors (502/503/504)
     * and network errors. Exponential backoff: 300ms → 600ms.
     */
    private async fetchWithRetry(url: string, config: RequestInit): Promise<Response> {
      let lastError: any;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await this.fetchWithTimeout(url, config);

          // Only retry on transient server errors for idempotent-ish requests
          if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          return response;
        } catch (err: any) {
          lastError = err;
          // Retry on network errors (not timeout — those already indicate server issues)
          if (err instanceof ApiError && err.status === 0) {
            // Timeout — don't retry
            throw err;
          }
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
      }

      throw lastError;
    }

    /**
     * Método genérico para realizar peticiones HTTP
     */
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      // Circuit breaker: si auth está muerta, no hacer requests (excepto endpoints públicos)
      if (this.isAuthDead && !this.isPublicAuthEndpoint(endpoint)) {
        throw new ApiError(401, 'Session expired', null);
      }

      const url = `${this.baseUrl}${endpoint}`;

      // 1. Preparar Headers
      const headers = new Headers(options.headers);

      // Auto-inyección de Content-Type si no está definido
      if (!headers.has('Content-Type')) {
          if (options.body instanceof URLSearchParams) {
              headers.set('Content-Type', 'application/x-www-form-urlencoded');
          } else if (!(options.body instanceof FormData)) {
              headers.set('Content-Type', 'application/json');
          }
      }

      // Auto-inyección de Authorization
      if (!this.accessToken && !this.isPublicAuthEndpoint(endpoint)) {
        const hasRefreshToken = typeof window !== 'undefined' && !!localStorage.getItem('refresh_token');
        if (hasRefreshToken) {
          try {
            await this.refreshAccessToken();
          } catch {
            // Si auth está muerta, cortar inmediatamente
            if (this.isAuthDead) {
              throw new ApiError(401, 'Session expired', null);
            }
          }
        } else {
          // Sin access token NI refresh token → auth muerta
          if (!this.isAuthDead) {
            this.isAuthDead = true;
            this.onAuthFailureCallback?.();
          }
          throw new ApiError(401, 'Session expired', null);
        }
      }
      if (this.accessToken) {
        headers.set('Authorization', `Bearer ${this.accessToken}`);
      }

      const config: RequestInit = {
        ...options,
        headers,
      };

      // 2. Ejecutar Request (with timeout + retry)
      let response = await this.fetchWithRetry(url, config);

      // 3. Manejo de 401/403 (Unauthorized/Forbidden) y Refresh Automático
      if (response.status === 401 || response.status === 403) {
          if (!this.isPublicAuthEndpoint(endpoint)) {
              try {
                  await this.refreshAccessToken();

                  // Reintentar el request original con el nuevo token
                  headers.set('Authorization', `Bearer ${this.accessToken}`);
                  response = await this.fetchWithRetry(url, { ...options, headers });
              } catch {
                  throw new ApiError(401, 'Session expired', null);
              }
          }
      }

      // 4. Manejo de Errores Generales
      if (!response.ok) {
        let errorData;
        const text = await response.text();
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { message: text };
        }

        throw new ApiError(response.status, response.statusText, errorData);
      }

      // 5. Retornar Datos (Manejo de 204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    }

    // --- Métodos Públicos ---

    public get<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
      return this.request<T>(endpoint, { method: 'GET', headers });
    }

    public post<T>(endpoint: string, body: any, headers?: HeadersInit): Promise<T> {
      const isUrlEncoded = body instanceof URLSearchParams;
      const isFormData = body instanceof FormData;

      return this.request<T>(endpoint, {
        method: 'POST',
        body: isUrlEncoded || isFormData ? body : JSON.stringify(body),
        headers
      });
    }

    public put<T>(endpoint: string, body: any, headers?: HeadersInit): Promise<T> {
      return this.request<T>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers
      });
    }

    public patch<T>(endpoint: string, body: any, headers?: HeadersInit): Promise<T> {
      return this.request<T>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers
      });
    }

    /**
     * Returns the raw Response (for non-JSON payloads like CSV).
     * Reuses the same auth/refresh/retry logic as request<T>().
     */
    public async getRaw(endpoint: string, headers?: HeadersInit): Promise<Response> {
      if (this.isAuthDead && !this.isPublicAuthEndpoint(endpoint)) {
        throw new ApiError(401, 'Session expired', null);
      }

      const url = `${this.baseUrl}${endpoint}`;

      const hdrs = new Headers(headers);

      if (!this.accessToken && !this.isPublicAuthEndpoint(endpoint)) {
        const hasRefreshToken = typeof window !== 'undefined' && !!localStorage.getItem('refresh_token');
        if (hasRefreshToken) {
          try { await this.refreshAccessToken(); } catch {
            if (this.isAuthDead) {
              throw new ApiError(401, 'Session expired', null);
            }
          }
        } else {
          if (!this.isAuthDead) {
            this.isAuthDead = true;
            this.onAuthFailureCallback?.();
          }
          throw new ApiError(401, 'Session expired', null);
        }
      }
      if (this.accessToken) {
        hdrs.set('Authorization', `Bearer ${this.accessToken}`);
      }

      let response = await this.fetchWithRetry(url, { method: 'GET', headers: hdrs });

      if (response.status === 401) {
        try {
          await this.refreshAccessToken();
          hdrs.set('Authorization', `Bearer ${this.accessToken}`);
          response = await this.fetchWithRetry(url, { method: 'GET', headers: hdrs });
        } catch {
          throw new ApiError(401, 'Session expired', null);
        }
      }

      if (!response.ok) {
        let errorData;
        const text = await response.text();
        try { errorData = JSON.parse(text); } catch { errorData = { message: text }; }
        throw new ApiError(response.status, response.statusText, errorData);
      }

      return response;
    }

    public delete<T>(endpoint: string, body?: any, headers?: HeadersInit): Promise<T> {
      return this.request<T>(endpoint, {
        method: 'DELETE',
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        headers,
      });
    }
  }

  // Exportamos la instancia única
  export const apiClient = ApiClient.getInstance();
