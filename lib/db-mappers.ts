/**
 * DB行データ → アプリエンティティ変換マッパー
 * 
 * 入出力契約:
 * - 入力: Supabaseから取得したsnake_case形式のDB行
 * - 出力: アプリで使用するcamelCase形式のエンティティ
 * - created_at/updated_at → Date変換
 * - null/undefined → デフォルト値適用
 */

import {
  Business, PaymentSource, ExpenseCategory, Recipient,
  Expense, Profit, Asset, RevenueDistribution, Model,
  TransferStatus, Category
} from './types';

// ========== 共通ユーティリティ ==========

/** 日付文字列をDateに変換（nullセーフ） */
export const toDate = (value: string | null | undefined): Date => {
  return value ? new Date(value) : new Date();
};

/** 日付文字列をDate | nullに変換 */
export const toDateOrNull = (value: string | null | undefined): Date | null => {
  return value ? new Date(value) : null;
};

/** 文字列のnull/undefinedをデフォルト値に変換 */
export const toString = (value: string | null | undefined, defaultValue = ''): string => {
  return value ?? defaultValue;
};

// ========== エンティティマッパー ==========

/** DB行 → Business */
export const mapToBusiness = (d: any, categories?: any): Business => ({
  id: d.id,
  name: d.name,
  category: categories?.name || d.category || '',
  categoryId: d.category_id || undefined,
  memo: d.memo,
  color: d.color || categories?.color,
  createdAt: toDate(d.created_at),
  updatedAt: toDate(d.updated_at),
});

/** DB行 → Expense */
export const mapToExpense = (d: any): Expense => ({
  id: d.id,
  date: toDate(d.date),
  month: d.month,
  business: d.business,
  paymentSource: d.payment_source,
  category: d.category,
  description: d.description,
  amount: d.amount,
  memo: d.memo,
  sourceData: d.source_data,
  isFixedCost: d.is_fixed_cost,
  fixedCostId: d.fixed_cost_id,
  createdAt: toDate(d.created_at),
  updatedAt: toDate(d.updated_at),
});

/** DB行 → Profit */
export const mapToProfit = (d: any): Profit => ({
  id: d.id,
  month: d.month,
  revenues: d.revenues,
  totalRevenue: d.total_revenue,
  totalExpense: d.total_expense,
  grossProfit: d.gross_profit,
  netProfit: d.net_profit,
  createdAt: toDate(d.created_at),
  updatedAt: toDate(d.updated_at),
});

/** 汎用: id/name/memo/created_at/updated_atを持つ行のマッパー */
const mapToNamedEntity = <T extends { id: string; name: string; memo: string; createdAt: Date; updatedAt: Date }>(d: any): T => ({
  id: d.id,
  name: d.name,
  memo: d.memo,
  createdAt: toDate(d.created_at),
  updatedAt: toDate(d.updated_at),
}) as T;

/** DB行 → PaymentSource */
export const mapToPaymentSource = (d: any): PaymentSource => mapToNamedEntity(d);

/** DB行 → ExpenseCategory */
export const mapToExpenseCategory = (d: any): ExpenseCategory => mapToNamedEntity(d);

/** DB行 → Recipient */
export const mapToRecipient = (d: any): Recipient => mapToNamedEntity(d);

/** DB行 → Asset */
export const mapToAsset = (d: any): Asset => ({
  id: d.id,
  assetType: d.asset_type,
  name: d.name,
  affiliation: d.affiliation,
  currentBalance: d.current_balance,
  currency: d.currency,
  updateDate: toDate(d.update_date),
  memo: d.memo,
  createdAt: toDate(d.created_at),
  updatedAt: toDate(d.updated_at),
});

/** DB行 → RevenueDistribution */
export const mapToRevenueDistribution = (d: any): RevenueDistribution => ({
  id: d.id,
  businessName: d.business_name,
  modelName: d.model_name,
  recipientName: d.recipient_name,
  distributionType: d.distribution_type,
  value: d.value,
  memo: d.memo,
  createdAt: toDate(d.created_at),
  updatedAt: toDate(d.updated_at),
});

/** DB行 → Model */
export const mapToModel = (d: any): Model => ({
  id: d.id,
  businessId: d.business_id,
  businessName: d.business_name,
  name: d.name,
  memo: d.memo,
  createdAt: toDate(d.created_at),
  updatedAt: toDate(d.updated_at),
});

/** DB行 → TransferStatus */
export const mapToTransferStatus = (d: any): TransferStatus => ({
  id: d.id,
  month: d.month,
  recipientName: d.recipient_name,
  businessName: d.business_name,
  status: d.status,
  paidAt: toDateOrNull(d.paid_at),
  memo: d.memo,
  createdAt: toDate(d.created_at),
  updatedAt: toDate(d.updated_at),
});

/** DB行 → Category */
export const mapToCategory = (d: any): Category => ({
  id: d.id,
  name: d.name,
  color: d.color,
  displayOrder: d.display_order,
  memo: toString(d.memo),
  createdAt: toDate(d.created_at),
  updatedAt: toDate(d.updated_at),
});

// ========== ジェネリックCRUDヘルパー ==========

/** テーブル存在エラーかどうかを判定 */
export const isTableNotFoundError = (error: any): boolean => {
  if (!error) return false;
  return Boolean(
    error.code === '42P01' ||
    error.code === 'PGRST204' ||
    error.message?.includes('does not exist') ||
    error.message?.includes('relation') ||
    error.message?.includes('not found')
  );
};

/** カラム存在エラーかどうかを判定 */
export const isColumnNotFoundError = (error: any): boolean => {
  if (!error) return false;
  return Boolean(
    error.code === '42703' ||
    error.message?.includes('category') ||
    error.message?.includes('column')
  );
};

/** 行が見つからないエラーかどうかを判定 */
export const isNotFoundError = (error: any): boolean => {
  if (!error) return false;
  return error.code === 'PGRST116';
};
