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

// 現在のユーザーIDを取得する関数
export const getCurrentUserId = async (): Promise<string | null> => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

// セッションからユーザーIDを取得（キャッシュ済みセッションを使用）
export const getCurrentUserIdFromSession = async (): Promise<string | null> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
};
