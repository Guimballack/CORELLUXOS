/**
 * Corellux OS - Supabase Client
 * Inicializa o cliente do Supabase utilizando as credenciais do .env.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase Client] Inicializando...');
console.log('[Supabase Client] URL configurada:', supabaseUrl || 'NÃO DEFINIDA');
if (supabaseAnonKey) {
    console.log('[Supabase Client] Anon Key configurada (Prefixo):', supabaseAnonKey.substring(0, 10) + '...');
} else {
    console.warn('[Supabase Client] Anon Key NÃO DEFINIDA');
}

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Credenciais ausentes no arquivo .env. Verifique sua configuração.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder-url.supabase.co', supabaseAnonKey || 'placeholder-key');

export default supabase;

