import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  if (typeof window === 'undefined') {
    console.warn("⚠️ Advertencia: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están definidos.");
  } else {
    console.error("🚨 Error crítico: Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
}

export const supabase = createClient(supabaseUrl || "https://missing.supabase.co", supabaseKey || "missing_key");

/**
 * Sincroniza la sesión del cliente Supabase frontend con los tokens del apiClient.
 * Esto habilita Supabase Realtime con RLS basado en el usuario autenticado.
 */
export async function syncSupabaseSession(accessToken: string, refreshToken: string) {
  await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
}
