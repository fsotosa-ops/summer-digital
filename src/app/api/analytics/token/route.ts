import { NextResponse } from 'next/server';

const SUPERSET_URL = (process.env.NEXT_PUBLIC_SUPERSET_URL || '').trim();
const SUPERSET_ADMIN = (process.env.SUPERSET_ADMIN_USERNAME || '').trim();
const SUPERSET_PASSWORD = (process.env.SUPERSET_ADMIN_PASSWORD || '').trim();
const DASHBOARD_ID = (process.env.NEXT_PUBLIC_SUPERSET_DASHBOARD_ID || '').trim();

// Force dynamic — never cache this route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!SUPERSET_URL || !SUPERSET_ADMIN || !SUPERSET_PASSWORD || !DASHBOARD_ID) {
      const missing = [
        !SUPERSET_URL && 'NEXT_PUBLIC_SUPERSET_URL',
        !SUPERSET_ADMIN && 'SUPERSET_ADMIN_USERNAME',
        !SUPERSET_PASSWORD && 'SUPERSET_ADMIN_PASSWORD',
        !DASHBOARD_ID && 'NEXT_PUBLIC_SUPERSET_DASHBOARD_ID',
      ].filter(Boolean);
      console.error('[Analytics] Missing env vars:', missing.join(', '));
      return NextResponse.json(
        { error: `Superset no está configurado. Faltan: ${missing.join(', ')}` },
        { status: 500 }
      );
    }

    // 1. Login to Superset
    console.log(`[Analytics] Logging in to Superset at ${SUPERSET_URL} as "${SUPERSET_ADMIN}"`);
    const loginResponse = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        username: SUPERSET_ADMIN,
        password: SUPERSET_PASSWORD,
        provider: 'db',
      }),
    });

    if (!loginResponse.ok) {
      const errorBody = await loginResponse.text();
      console.error(
        `[Analytics] Superset login failed — status: ${loginResponse.status}, ` +
        `user: "${SUPERSET_ADMIN}", body: ${errorBody}`
      );
      return NextResponse.json(
        {
          error: 'Error al autenticar con Superset. Verifica las credenciales en GCP Secret Manager.',
          detail: `Status ${loginResponse.status}: ${errorBody}`,
        },
        { status: 502 }
      );
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.access_token;

    if (!accessToken) {
      console.error('[Analytics] Login succeeded but no access_token in response:', loginData);
      return NextResponse.json(
        { error: 'Superset login response missing access_token' },
        { status: 502 }
      );
    }

    // 2. Get CSRF token
    const csrfResponse = await fetch(`${SUPERSET_URL}/api/v1/security/csrf_token/`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!csrfResponse.ok) {
      const csrfError = await csrfResponse.text();
      console.error(`[Analytics] CSRF token failed — status: ${csrfResponse.status}, body: ${csrfError}`);
      return NextResponse.json(
        { error: 'Error al obtener token CSRF de Superset', detail: csrfError },
        { status: 502 }
      );
    }

    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.result;

    // 3. Generate Guest Token
    const guestResponse = await fetch(`${SUPERSET_URL}/api/v1/security/guest_token/`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-CSRFToken': csrfToken,
        Referer: SUPERSET_URL,
      },
      body: JSON.stringify({
        user: {
          username: 'oasis_admin_viewer',
          first_name: 'Admin',
          last_name: 'Viewer',
        },
        resources: [{ type: 'dashboard', id: DASHBOARD_ID }],
        rls: [],
      }),
    });

    if (!guestResponse.ok) {
      const guestError = await guestResponse.text();
      console.error(`[Analytics] Guest token failed — status: ${guestResponse.status}, body: ${guestError}`);
      return NextResponse.json(
        { error: 'Error al generar guest token de Superset', detail: guestError },
        { status: 502 }
      );
    }

    const guestData = await guestResponse.json();

    if (!guestData.token) {
      console.error('[Analytics] Guest token response missing token field:', guestData);
      return NextResponse.json(
        { error: 'Superset guest token response missing token' },
        { status: 502 }
      );
    }

    return NextResponse.json({ token: guestData.token });
  } catch (error) {
    console.error('[Analytics] Unhandled error:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor de analítica',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}