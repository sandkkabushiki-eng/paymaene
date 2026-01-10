import type { Metadata } from 'next'
import './globals.css'
import { cn } from '@/lib/utils'
import { AuthProvider } from '@/lib/auth-context'
import { AuthGuard } from '@/components/auth/auth-guard'
import { AppShell } from '@/components/layout/app-shell'

export const metadata: Metadata = {
  title: 'Sales Manager - 売上管理アプリ',
  description: '個人事業の売上・経費・利益・資産を管理するモダンなアプリケーション',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={cn("min-h-screen bg-gray-50 text-gray-900 font-sans antialiased")}>
        <AuthProvider>
          <AuthGuard>
            <AppShell>
              {children}
            </AppShell>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
