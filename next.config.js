/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages用の設定
  experimental: {
    runtime: 'edge',
  },
  // 画像最適化を無効化（Cloudflare Workers/Pagesではサポート外）
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
