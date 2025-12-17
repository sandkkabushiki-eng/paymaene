# 売り上げ管理アプリ

個人事業の売上・経費・利益・資産を管理するWebアプリケーション

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React 18, TypeScript
- **データベース**: Supabase (PostgreSQL)
- **スタイリング**: Tailwind CSS
- **UIコンポーネント**: Radix UI
- **デプロイ**: Vercel

## 機能

### 1. ダッシュボード
- 月別売上・経費・利益の推移グラフ（事業別色分け）
- 事業別売上一覧
- 最近の経費一覧

### 2. 経費管理
- 経費の登録・編集・削除
- CSVファイルからの一括取り込み（AMEX対応）
- 月別・事業別での絞り込み
- 重複取り込みの防止
- 固定費機能（毎月自動反映）

### 3. 利益管理
- 月次売上の入力（事業別）
- 経費合計の自動計算
- 粗利・税金・純利益の自動計算
- 年別での管理

### 4. 資産管理
- 資産の登録・編集・削除
- 複数通貨対応（JPY、USD、EUR）
- 通貨別の合計表示

### 5. 収益分配
- 分配先ごとの分配率・金額設定
- 事業別の分配管理

### 6. 振り込み管理
- 月別の振り込み金額一覧
- 事業別・全事業での集計
- 経費立て替えの精算

### 7. 設定
- 事業管理（色設定付き）
- 支払元・分配先管理
- 経費カテゴリー管理
- モデル/部署管理

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabase設定

1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. `supabase-schema.sql`の内容をSQL Editorで実行
3. `.env.local`ファイルを作成し、以下の環境変数を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. ローカル開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## デプロイ

### Vercelへのデプロイ

1. GitHubリポジトリにプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定（NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY）
4. デプロイ

## データ構造

### 経費 (expenses)
- `date`: 日付
- `month`: 月（"2025-10"形式）
- `business`: 事業名
- `payment_source`: 支払元
- `category`: 経費カテゴリ
- `description`: 内容
- `amount`: 金額
- `memo`: メモ
- `source_data`: 元データ（ファイル名など）
- `is_fixed_cost`: 固定費フラグ
- `fixed_cost_id`: 固定費のID

### 利益 (profits)
- `month`: 月（"2025-10"形式）
- `revenues`: 事業別売上（JSONB）
- `total_revenue`: 売上合計
- `total_expense`: 経費合計
- `gross_profit`: 粗利
- `net_profit`: 純利益

### 資産 (assets)
- `asset_type`: 資産種別
- `name`: 名称
- `affiliation`: 所属
- `current_balance`: 現在残高
- `currency`: 通貨
- `update_date`: 更新日
- `memo`: メモ

### 事業 (businesses)
- `name`: 事業名
- `memo`: メモ
- `color`: テーマカラー

### 収益分配 (revenue_distributions)
- `business_name`: 事業名
- `model_name`: モデル名
- `recipient_name`: 分配先名
- `distribution_type`: 分配タイプ（percentage/amount）
- `value`: 値

## セキュリティ

- Supabase Row Level Security (RLS) を使用
- 環境変数で認証情報を管理
- クライアントサイドでの直接アクセス（anon key使用）

**注意**: 本番環境では適切なRLSポリシーを設定してください。

## ライセンス

MIT
