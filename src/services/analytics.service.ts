class AnalyticsService {
  async getGuestToken(): Promise<string> {
    const response = await fetch('/api/analytics/token', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || 'No se pudo obtener el token de acceso al dashboard.';
      console.error('[AnalyticsService] Token fetch failed:', {
        status: response.status,
        error: errorData.error,
        detail: errorData.detail,
      });
      throw new Error(message);
    }

    const data = await response.json();

    if (!data.token) {
      throw new Error('La respuesta del servidor no incluye un token válido.');
    }

    return data.token;
  }
}

export const analyticsService = new AnalyticsService();