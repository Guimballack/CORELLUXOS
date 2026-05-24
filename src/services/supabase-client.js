/**
 * Corellux OS - Supabase Client
 * Inicializa o cliente do Supabase utilizando as credenciais do .env.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Credenciais ausentes no arquivo .env. Verifique sua configuração.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
