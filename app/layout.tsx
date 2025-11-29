import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '売り上げ管理アプリ',
  description: '個人事業の売上・経費・利益・資産を管理するアプリ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

