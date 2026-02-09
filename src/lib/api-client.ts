/**
 * Error personalizado para manejar respuestas de la API
 */
export class ApiError extends Error {
    status: number;
    statusText: string;
    data: any;
  
    constructor(status: number, statusText: string, data: any) {
      super(`API Error ${status}: ${statusText}`);
      this.name = 'ApiError';
      this.status = status;
      this.statusText = statusText;
      this.data = data;
    }
  }
  
  class ApiClient {
    private static instance: ApiClient;
    private baseUrl: string;
    
    // Tokens: Access en memoria, Refresh en localStorage (gestionado internamente)
    private accessToken: string | null = null;
    
    // Promesa de refresh para deduplicación (Singleton de la promesa)
    private refreshPromise: Promise<void> | null = null;
  
    private constructor() {
      this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    }
  
    public static getInstance(): ApiClient {
      if (!ApiClient.instance) {
        ApiClient.instance = new ApiClient();
      }
      return ApiClient.instance;
    }
  
    /**
     * Configura los tokens (llamado al hacer login o refresh exitoso)
     */
    public setTokens(accessToken: string, refreshToken: string) {
      this.accessToken = accessToken;
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
          // NOTA: Ajusta el endpoint y el formato del body según tu backend específico
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
          // Si solo devuelve access_token, reutiliza el refresh_token actual
          this.setTokens(data.access_token, data.refresh_token || refreshToken);
  
        } catch (error: unknown) { // Changed from any to unknown
          // Si el refresh falla, es irrecuperable: logout forzado
          this.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login'; // Redirección fuerte
          }
          throw error;
        } finally {
          // Limpiamos la promesa para permitir futuros refrescos
          this.refreshPromise = null;
        }
      })();
  
      return this.refreshPromise;
    }
  
    /**
     * Método genérico para realizar peticiones HTTP
     */
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const url = `${this.baseUrl}${endpoint}`;
      
      // 1. Preparar Headers
      const headers = new Headers(options.headers);
  
      // Auto-inyección de Content-Type si no está definido
      // Detectamos si es form-urlencoded (necesario para OAuth2 login)
      if (!headers.has('Content-Type')) {
          if (options.body instanceof URLSearchParams) {
              headers.set('Content-Type', 'application/x-www-form-urlencoded');
          } else if (!(options.body instanceof FormData)) {
              // Default a JSON si no es FormData ni URLSearchParams
              headers.set('Content-Type', 'application/json');
          }
      }
  
      // Auto-inyección de Authorization
      // Si no hay access token en memoria pero sí hay refresh token, refrescar proactivamente
      // (esto ocurre después de un page refresh, ya que el access token solo vive en memoria)
      if (!this.accessToken && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        const hasRefreshToken = typeof window !== 'undefined' && !!localStorage.getItem('refresh_token');
        if (hasRefreshToken) {
          try {
            await this.refreshAccessToken();
          } catch {
            // Si falla, continuamos sin token (el 401 handler lo reintentará)
          }
        }
      }
      if (this.accessToken) {
        headers.set('Authorization', `Bearer ${this.accessToken}`);
      }
  
      const config: RequestInit = {
        ...options,
        headers,
      };
  
      // 2. Ejecutar Request
      let response = await fetch(url, config);
  
      // 3. Manejo de 401 (Unauthorized) y Refresh Automático
      if (response.status === 401) {
          // Evitar intentar refrescar si el fallo fue EN el endpoint de login o refresh
          // para no crear bucles infinitos si las credenciales son inválidas.
          if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
              try {
                  await this.refreshAccessToken();
                  
                  // Reintentar el request original con el nuevo token
                  headers.set('Authorization', `Bearer ${this.accessToken}`);
                  response = await fetch(url, { ...options, headers });
              } catch (refreshError) {
                  // El refresh falló (ya manejado en refreshAccessToken con redirect), 
                  // lanzamos el error original del 401
                  throw new ApiError(401, 'Session expired', null);
              }
          }
      }
  
      // 4. Manejo de Errores Generales
      if (!response.ok) {
        let errorData;
        // Leer body como texto una sola vez, luego intentar parsear como JSON
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
      // Soporte automático para x-www-form-urlencoded si body es URLSearchParams
      const isUrlEncoded = body instanceof URLSearchParams;
      
      return this.request<T>(endpoint, {
        method: 'POST',
        body: isUrlEncoded ? body : JSON.stringify(body),
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