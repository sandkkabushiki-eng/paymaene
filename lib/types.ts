// 事業タイプ（後方互換性のため残す）
export type BusinessType = 'MyFans' | '非属人人' | 'ココナラ' | '共通';

// 事業データ
export interface Business {
  id?: string;
  name: string; // 事業名（例: "MyFans", "非属人人", "ココナラ"など）
  memo: string; // メモ
  createdAt?: Date;
  updatedAt?: Date;
}

// モデル/部署データ（事業に紐づく）
export interface Model {
  id?: string;
  businessId: string; // 所属する事業のID
  businessName: string; // 所属する事業名（検索用）
  name: string; // モデル名（例: "モデルA", "モデルB"など）
  memo: string; // メモ
  createdAt?: Date;
  updatedAt?: Date;
}

// 経費データ
export interface Expense {
  id?: string;
  date: Date | string;
  month: string; // "2025-10" 形式
  business: string; // 事業名
  paymentSource: string; // 支払元（例: "AMEX"）
  category: string; // 経費カテゴリ
  description: string; // 内容
  amount: number; // 金額
  memo: string; // メモ
  sourceData: string; // 元データ（ファイル名など）
  createdAt?: Date;
  updatedAt?: Date;
}

// 利益管理データ
export interface Profit {
  id?: string;
  month: string; // "2025-10" 形式
  // 後方互換性のため残す
  myfansRevenue?: number; // MyFans売上
  hijozokuRevenue?: number; // 非属人人売上
  coconalaRevenue?: number; // ココナラ売上
  // 動的な事業売上（事業名をキーとした売上データ）
  revenues?: Record<string, number>; // { "事業名": 売上金額 }
  totalRevenue: number; // 売上合計（計算）
  totalExpense: number; // 経費合計（計算）
  grossProfit: number; // 粗利（計算）
  netProfit: number; // 純利益（計算）
  createdAt?: Date;
  updatedAt?: Date;
}

// 資産データ
export interface Asset {
  id?: string;
  assetType: string; // 資産種別
  name: string; // 名称
  affiliation: string; // 所属
  currentBalance: number; // 現在残高
  currency: string; // 通貨
  updateDate: Date | string; // 更新日
  memo: string; // メモ
  createdAt?: Date;
  updatedAt?: Date;
}

// 支払い元データ
export interface PaymentSource {
  id?: string;
  name: string; // 支払い元名（例: "AMEX", "Visa", "銀行口座"など）
  memo: string; // メモ
  createdAt?: Date;
  updatedAt?: Date;
}

// 経費カテゴリーデータ
export interface ExpenseCategory {
  id?: string;
  name: string; // カテゴリー名（例: "交通費", "通信費", "事務用品"など）
  memo: string; // メモ
  createdAt?: Date;
  updatedAt?: Date;
}

// 分配先データ
export interface Recipient {
  id?: string;
  name: string; // 分配先名（例: "パートナーA", "投資家B", "自分"など）
  memo: string; // メモ
  createdAt?: Date;
  updatedAt?: Date;
}

// 収益分配データ
export interface RevenueDistribution {
  id?: string;
  businessName: string; // 事業名
  modelName?: string; // モデル名（オプション、モデルごとの分配の場合に設定）
  recipientName: string; // 分配先名（例: "パートナーA", "投資家B"など）
  distributionType: 'percentage' | 'amount'; // 分配タイプ（パーセント or 金額）
  value: number; // 分配率（%）または分配金額
  memo: string; // メモ
  createdAt?: Date;
  updatedAt?: Date;
}

