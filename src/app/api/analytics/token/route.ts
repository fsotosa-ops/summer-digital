import { NextResponse } from 'next/server';

// Asegúrate de tener estas variables en tu archivo .env
const SUPERSET_URL = process.env.NEXT_PUBLIC_SUPERSET_URL || '';
const SUPERSET_ADMIN = process.env.NEXT_PUBLIC_SUPERSET_ADMIN || '';
const SUPERSET_PASSWORD = process.env.NEXT_PUBLIC_SUPERSET_PASSWORD || '';
const DASHBOARD_ID = process.env.NEXT_PUBLIC_SUPERSET_DASHBOARD_ID || '';

export async function GET() {
  try {
    // 1. Autenticación con Superset (Obtener Access Token de Admin)
    const loginResponse = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: SUPERSET_ADMIN,
        password: SUPERSET_PASSWORD,
        provider: 'db',
      }),
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('Superset Login Failed:', errorText);
      return NextResponse.json(
        { error: 'Error al autenticar con el motor de análisis' },
        { status: 401 }
      );
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.access_token;

    // 2. Obtener Token CSRF (Necesario para versiones recientes de Superset)
    const csrfResponse = await fetch(`${SUPERSET_URL}/api/v1/security/csrf_token/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!csrfResponse.ok) {
      console.error('Superset CSRF Failed');
      return NextResponse.json(
        { error: 'Error al obtener token de seguridad' },
        { status: 500 }
      );
    }

    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.result;

    // 3. Generar Guest Token (El token que usará el iframe)
    // Este usuario "invitado" herederá los permisos del rol "GuestRole" que configuraste
    const guestResponse = await fetch(`${SUPERSET_URL}/api/v1/security/guest_token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-CSRFToken': csrfToken,
        Referer: SUPERSET_URL, // Importante para evitar validaciones estrictas
      },
      body: JSON.stringify({
        user: {
          username: 'oasis_admin_viewer',
          first_name: 'Admin',
          last_name: 'Viewer',
        },
        resources: [
          {
            type: 'dashboard',
            id: DASHBOARD_ID,
          },
        ],
        rls: [], // Aquí podrías filtrar datos si fuera necesario
      }),
    });

    if (!guestResponse.ok) {
      const guestError = await guestResponse.text();
      console.error('Guest Token Generation Failed:', guestError);
      return NextResponse.json(
        { error: 'Error al generar sesión de invitado' },
        { status: 500 }
      );
    }

    const guestData = await guestResponse.json();
    
    // Devolver solo el token al frontend
    return NextResponse.json({ token: guestData.token });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor de analítica' },
      { status: 500 }
    );
  }
}