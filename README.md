# 売り上げ管理アプリ

個人事業の売上・経費・利益・資産を管理するWebアプリケーション

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), React, TypeScript
- **データベース**: Firebase Firestore
- **スタイリング**: Tailwind CSS
- **デプロイ**: Vercel

## 機能

### 1. 経費管理
- 経費の登録・編集・削除
- CSVファイルからの一括取り込み（AMEX対応）
- 月別・事業別での絞り込み
- 重複取り込みの防止

### 2. 利益管理
- 月次売上の入力（MyFans、非属人人、ココナラ）
- 経費合計の自動計算
- 粗利・純利益の自動計算
- 2025-10から2026-09までの12ヶ月分を管理

### 3. 資産管理
- 資産の登録・編集・削除
- 複数通貨対応（JPY、USD、EUR）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Firebase設定

1. Firebaseプロジェクトを作成
2. Firestoreデータベースを有効化
3. `.env.local`ファイルを作成し、以下の環境変数を設定：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Firestoreセキュリティルール

`firestore.rules`ファイルをFirebaseコンソールでデプロイしてください。

### 4. ローカル開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## デプロイ

### Vercelへのデプロイ

1. GitHubリポジトリにプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定
4. デプロイ

### Firebase Hostingへのデプロイ（オプション）

```bash
npm run build
firebase deploy --only hosting
```

## データ構造

### 経費 (expenses)
- `date`: 日付
- `month`: 月（"2025-10"形式）
- `business`: 事業（"MyFans" | "非属人人" | "ココナラ" | "共通"）
- `paymentSource`: 支払元
- `category`: 経費カテゴリ
- `description`: 内容
- `amount`: 金額
- `memo`: メモ
- `sourceData`: 元データ（ファイル名など）

### 利益 (profits)
- `month`: 月（"2025-10"形式）
- `myfansRevenue`: MyFans売上
- `hijozokuRevenue`: 非属人人売上
- `coconalaRevenue`: ココナラ売上
- `totalRevenue`: 売上合計（自動計算）
- `totalExpense`: 経費合計（自動計算）
- `grossProfit`: 粗利（自動計算）
- `netProfit`: 純利益（自動計算）

### 資産 (assets)
- `assetType`: 資産種別
- `name`: 名称
- `affiliation`: 所属
- `currentBalance`: 現在残高
- `currency`: 通貨
- `updateDate`: 更新日
- `memo`: メモ

## ライセンス

MIT

