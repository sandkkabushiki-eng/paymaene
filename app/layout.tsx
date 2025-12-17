import type { Metadata } from 'next'
import { Sidebar } from '@/components/layout/sidebar'
import './globals.css'
import { cn } from '@/lib/utils'

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
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300 ease-in-out">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
