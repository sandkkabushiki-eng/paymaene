'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  // ログインページはフルスクリーンで表示
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 通常ページはサイドバー付きレイアウト
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
