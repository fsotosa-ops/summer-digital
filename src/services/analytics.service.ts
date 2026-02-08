class AnalyticsService {
  /**
   * Obtiene el guest token llamando a nuestra propia API interna (BFF).
   * Esto mantiene las credenciales de Superset seguras en el servidor.
   */
  async getGuestToken(): Promise<string> {
    const response = await fetch('/api/analytics/token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'No se pudo obtener el token de acceso al dashboard.');
    }

    const data = await response.json();
    return data.token;
  }
}

export const analyticsService = new AnalyticsService();