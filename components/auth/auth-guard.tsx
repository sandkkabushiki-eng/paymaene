'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  // ログインページはそのまま表示
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // 未認証の場合は何も表示しない（リダイレクト待ち）
  if (!user) {
    return null;
  }

  // 認証済みの場合はchildren表示
  return <>{children}</>;
}
