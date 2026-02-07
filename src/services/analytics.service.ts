const SUPERSET_URL = process.env.NEXT_PUBLIC_SUPERSET_URL || '';
const SUPERSET_ADMIN = process.env.NEXT_PUBLIC_SUPERSET_ADMIN || '';
const SUPERSET_PASSWORD = process.env.NEXT_PUBLIC_SUPERSET_PASSWORD || '';
const DASHBOARD_ID = process.env.NEXT_PUBLIC_SUPERSET_DASHBOARD_ID || '';

class AnalyticsService {
  /**
   * Obtiene un guest token de Superset autenticándose directamente
   * desde el browser (bypasea el backend / Cloud Run DNS issue).
   */
  async getGuestToken(): Promise<string> {
    // 1. Login a Superset para obtener access token
    const loginResp = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: SUPERSET_ADMIN,
        password: SUPERSET_PASSWORD,
        provider: 'db',
      }),
    });
    if (!loginResp.ok) {
      throw new Error('No se pudo autenticar con Superset.');
    }
    const { access_token } = await loginResp.json();

    // 2. Obtener CSRF token
    const csrfResp = await fetch(`${SUPERSET_URL}/api/v1/security/csrf_token/`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${access_token}` },
      credentials: 'include',
    });
    if (!csrfResp.ok) {
      throw new Error('No se pudo obtener CSRF token de Superset.');
    }
    const { result: csrfToken } = await csrfResp.json();

    // 3. Crear guest token
    const guestResp = await fetch(`${SUPERSET_URL}/api/v1/security/guest_token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
        'X-CSRFToken': csrfToken,
        Referer: SUPERSET_URL,
      },
      credentials: 'include',
      body: JSON.stringify({
        resources: [{ type: 'dashboard', id: DASHBOARD_ID }],
        rls: [],
        user: { username: 'superadmin', first_name: 'Admin', last_name: '' },
      }),
    });
    if (!guestResp.ok) {
      throw new Error('No se pudo crear guest token de Superset.');
    }
    const { token } = await guestResp.json();
    return token;
  }
}

export const analyticsService = new AnalyticsService();
