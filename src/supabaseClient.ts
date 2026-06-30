import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação para garantir que o Vite carregou as strings corretamente
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Erro: As variáveis de ambiente não foram carregadas. Verifique o arquivo .env.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');