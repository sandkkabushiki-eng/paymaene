import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
}

// シングルトンインスタンス
// eslint-disable-next-line
let supabaseInstance: SupabaseClient<any, 'public', any> | null = null;

// eslint-disable-next-line
export const createClient = (): SupabaseClient<any, 'public', any> => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
};

// 後方互換性のためにインスタンスもエクスポート
export const supabase = createClient();
