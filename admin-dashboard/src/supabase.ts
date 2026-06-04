import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (isSupabaseConfigured) {
  console.log('🔌 Admin Panel connected to Supabase Database!');
} else {
  console.log('⚠️ Supabase credentials missing. Admin Dashboard running in Offline Demo Mode.');
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
