import { createClient, getCurrentUserId } from './supabase';
import { 
  Business, PaymentSource, ExpenseCategory, Recipient, 
  Expense, Profit, Asset, RevenueDistribution, Model, TransferStatus, Category
} from './types';
import {
  mapToBusiness,
  mapToExpense,
  mapToProfit,
  mapToPaymentSource,
  mapToExpenseCategory,
  mapToRecipient,
  mapToAsset,
  mapToRevenueDistribution,
  mapToModel,
  mapToTransferStatus,
  mapToCategory,
  isColumnNotFoundError,
  isTableNotFoundError,
  isNotFoundError,
} from './db-mappers';

// ========== ヘルパー関数 ==========

/** 日付をDB用文字列に変換 */
const formatDateForDB = (date: Date | string): string => {
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return date;
};

/** ユーザーIDを取得（未ログインはエラー） */
const requireUserId = async (): Promise<string> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('ログインが必要です');
  }
  return userId;
};

/** 汎用削除関数 */
const deleteFromTable = async (table: string, id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
};

/** undefinedでないフィールドのみ抽出 */
const pickDefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
};

// ========== 事業 (Business) ==========

export const getAllBusinesses = async (): Promise<Business[]> => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('businesses')
    .select(`*, categories:category_id (id, name, color)`)
    .order('created_at', { ascending: true });
    
  if (error) {
    if (isColumnNotFoundError(error)) {
      const { data: retryData, error: retryError } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: true });
      if (retryError) throw retryError;
      return (retryData || []).map(d => mapToBusiness(d));
    }
    throw error;
  }
  
  return (data || []).map((d: any) => mapToBusiness(d, d.categories));
};

export const addBusiness = async (business: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Promise<Business> => {
  const supabase = createClient();
  const userId = await requireUserId();
  
  const insertData: any = {
    name: business.name,
    memo: business.memo,
    color: business.color,
    user_id: userId,
    ...(business.categoryId ? { category_id: business.categoryId } : {}),
    ...(business.category !== undefined && !business.categoryId ? { category: business.category } : {}),
  };
  
  const { data, error } = await supabase
    .from('businesses')
    .insert(insertData)
    .select(`*, categories:category_id (id, name, color)`)
    .single();
    
  if (error) {
    if (isColumnNotFoundError(error)) {
      const retryData = {
        name: business.name,
        memo: business.memo,
        color: business.color,
        user_id: userId,
        ...(business.category ? { category: business.category } : {}),
      };
      const { data: retryResult, error: retryError } = await supabase
        .from('businesses')
        .insert(retryData)
        .select()
        .single();
      if (retryError) throw retryError;
      return mapToBusiness(retryResult);
    }
    throw error;
  }
  
  return mapToBusiness(data, data.categories);
};

export const updateBusiness = async (id: string, business: Partial<Business>): Promise<void> => {
  const supabase = createClient();
  
  const updateData: any = pickDefined({
    name: business.name,
    memo: business.memo,
    color: business.color,
    category_id: business.categoryId !== undefined ? (business.categoryId || null) : undefined,
    category: business.categoryId === undefined ? business.category : undefined,
    updated_at: new Date().toISOString(),
  });
  
  const { error } = await supabase.from('businesses').update(updateData).eq('id', id);
    
  if (error) {
    if (isColumnNotFoundError(error)) {
      const retryData = pickDefined({
        name: business.name,
        memo: business.memo,
        color: business.color,
        category: business.category,
        updated_at: new Date().toISOString(),
      });
      const { error: retryError } = await supabase.from('businesses').update(retryData).eq('id', id);
      if (retryError) throw retryError;
      return;
    }
    throw error;
  }
};

export const deleteBusiness = async (id: string): Promise<void> => deleteFromTable('businesses', id);

export const getBusiness = async (id: string): Promise<Business | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('businesses').select('*').eq('id', id).single();
  if (error) return null;
  return mapToBusiness(data);
};

// ========== 経費 (Expense) ==========

export const getExpenses = async (options?: { month?: string }): Promise<Expense[]> => {
  const supabase = createClient();
  let query = supabase.from('expenses').select('*').order('date', { ascending: false });
  if (options?.month) query = query.eq('month', options.month);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapToExpense);
};

export const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> => {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      date: formatDateForDB(expense.date),
      month: expense.month,
      business: expense.business,
      payment_source: expense.paymentSource,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      memo: expense.memo,
      source_data: expense.sourceData,
      is_fixed_cost: expense.isFixedCost,
      fixed_cost_id: expense.fixedCostId,
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return mapToExpense(data);
};

export const updateExpense = async (id: string, expense: Partial<Expense>): Promise<void> => {
  const supabase = createClient();
  const updateData = pickDefined({
    date: expense.date !== undefined ? formatDateForDB(expense.date) : undefined,
    month: expense.month,
    business: expense.business,
    payment_source: expense.paymentSource,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    memo: expense.memo,
    is_fixed_cost: expense.isFixedCost,
    fixed_cost_id: expense.fixedCostId,
    updated_at: new Date().toISOString(),
  });
  const { error } = await supabase.from('expenses').update(updateData).eq('id', id);
  if (error) throw error;
};

export const deleteExpense = async (id: string): Promise<void> => deleteFromTable('expenses', id);

export const getExpense = async (id: string): Promise<Expense | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('expenses').select('*').eq('id', id).single();
  if (error) return null;
  return mapToExpense(data);
};

// ========== 利益 (Profit) ==========

export const getAllProfits = async (): Promise<Profit[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('profits').select('*').order('month', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapToProfit);
};

export const getProfit = async (month: string): Promise<Profit | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('profits').select('*').eq('month', month).single();
  if (error && !isNotFoundError(error)) throw error;
  return data ? mapToProfit(data) : null;
};

export const addProfit = async (profit: Omit<Profit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Profit> => {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('profits')
    .insert({
      month: profit.month,
      revenues: profit.revenues,
      total_revenue: profit.totalRevenue,
      total_expense: profit.totalExpense,
      gross_profit: profit.grossProfit,
      net_profit: profit.netProfit,
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return mapToProfit(data);
};

export const updateProfit = async (id: string, profit: Partial<Profit>): Promise<void> => {
  const supabase = createClient();
  const updateData = pickDefined({
    revenues: profit.revenues,
    total_revenue: profit.totalRevenue,
    total_expense: profit.totalExpense,
    gross_profit: profit.grossProfit,
    net_profit: profit.netProfit,
    updated_at: new Date().toISOString(),
  });
  const { error } = await supabase.from('profits').update(updateData).eq('id', id);
  if (error) throw error;
};

export const deleteProfit = async (id: string): Promise<void> => deleteFromTable('profits', id);

export const calculateProfitForMonth = async (month: string): Promise<Omit<Profit, 'id' | 'createdAt' | 'updatedAt'>> => {
  const existingProfit = await getProfit(month);
  const revenues = existingProfit?.revenues || {};
  
  const supabase = createClient();
  const { data: expenses, error } = await supabase.from('expenses').select('amount').eq('month', month);
  if (error) throw error;
  
  const totalExpense = (expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
  const totalRevenue = Object.values(revenues).reduce((sum, rev) => sum + (rev as number), 0);
  const grossProfit = totalRevenue - totalExpense;
  
  return { month, revenues, totalRevenue, totalExpense, grossProfit, netProfit: grossProfit };
};

// ========== 支払い元 (PaymentSource) ==========

export const getAllPaymentSources = async (): Promise<PaymentSource[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('payment_sources').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapToPaymentSource);
};

export const addPaymentSource = async (source: Omit<PaymentSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentSource> => {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('payment_sources')
    .insert({ name: source.name, memo: source.memo, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return mapToPaymentSource(data);
};

export const updatePaymentSource = async (id: string, source: Partial<PaymentSource>): Promise<void> => {
  const supabase = createClient();
  const updateData = pickDefined({ name: source.name, memo: source.memo, updated_at: new Date().toISOString() });
  const { error } = await supabase.from('payment_sources').update(updateData).eq('id', id);
  if (error) throw error;
};

export const deletePaymentSource = async (id: string): Promise<void> => deleteFromTable('payment_sources', id);

// ========== 経費カテゴリー (ExpenseCategory) ==========

export const getAllExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('expense_categories').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapToExpenseCategory);
};

export const addExpenseCategory = async (category: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseCategory> => {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ name: category.name, memo: category.memo, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return mapToExpenseCategory(data);
};

export const updateExpenseCategory = async (id: string, category: Partial<ExpenseCategory>): Promise<void> => {
  const supabase = createClient();
  const updateData = pickDefined({ name: category.name, memo: category.memo, updated_at: new Date().toISOString() });
  const { error } = await supabase.from('expense_categories').update(updateData).eq('id', id);
  if (error) throw error;
};

export const deleteExpenseCategory = async (id: string): Promise<void> => deleteFromTable('expense_categories', id);

// ========== 資産 (Asset) ==========

export const getAllAssets = async (): Promise<Asset[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('assets').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapToAsset);
};

export const addAsset = async (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> => {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('assets')
    .insert({
      asset_type: asset.assetType,
      name: asset.name,
      affiliation: asset.affiliation,
      current_balance: asset.currentBalance,
      currency: asset.currency,
      update_date: formatDateForDB(asset.updateDate),
      memo: asset.memo,
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return mapToAsset(data);
};

export const updateAsset = async (id: string, asset: Partial<Asset>): Promise<void> => {
  const supabase = createClient();
  const updateData = pickDefined({
    asset_type: asset.assetType,
    name: asset.name,
    affiliation: asset.affiliation,
    current_balance: asset.currentBalance,
    currency: asset.currency,
    update_date: asset.updateDate !== undefined ? formatDateForDB(asset.updateDate) : undefined,
    memo: asset.memo,
    updated_at: new Date().toISOString(),
  });
  const { error } = await supabase.from('assets').update(updateData).eq('id', id);
  if (error) throw error;
};

export const deleteAsset = async (id: string): Promise<void> => deleteFromTable('assets', id);

// ========== 収益分配 (RevenueDistribution) ==========

export const getAllRevenueDistributions = async (): Promise<RevenueDistribution[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('revenue_distributions').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapToRevenueDistribution);
};

export const addRevenueDistribution = async (dist: Omit<RevenueDistribution, 'id' | 'createdAt' | 'updatedAt'>): Promise<RevenueDistribution> => {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('revenue_distributions')
    .insert({
      business_name: dist.businessName,
      model_name: dist.modelName,
      recipient_name: dist.recipientName,
      distribution_type: dist.distributionType,
      value: dist.value,
      memo: dist.memo,
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return mapToRevenueDistribution(data);
};

export const updateRevenueDistribution = async (id: string, dist: Partial<RevenueDistribution>): Promise<void> => {
  const supabase = createClient();
  const updateData = pickDefined({
    business_name: dist.businessName,
    model_name: dist.modelName,
    recipient_name: dist.recipientName,
    distribution_type: dist.distributionType,
    value: dist.value,
    memo: dist.memo,
    updated_at: new Date().toISOString(),
  });
  const { error } = await supabase.from('revenue_distributions').update(updateData).eq('id', id);
  if (error) throw error;
};

export const deleteRevenueDistribution = async (id: string): Promise<void> => deleteFromTable('revenue_distributions', id);

// ========== モデル (Model) ==========

export const getAllModels = async (): Promise<Model[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('models').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapToModel);
};

export const addModel = async (model: Omit<Model, 'id' | 'createdAt' | 'updatedAt'>): Promise<Model> => {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('models')
    .insert({
      business_id: model.businessId,
      business_name: model.businessName,
      name: model.name,
      memo: model.memo,
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return mapToModel(data);
};

export const updateModel = async (id: string, model: Partial<Model>): Promise<void> => {
  const supabase = createClient();
  const updateData = pickDefined({
    business_id: model.businessId,
    business_name: model.businessName,
    name: model.name,
    memo: model.memo,
    updated_at: new Date().toISOString(),
  });
  const { error } = await supabase.from('models').update(updateData).eq('id', id);
  if (error) throw error;
};

export const deleteModel = async (id: string): Promise<void> => deleteFromTable('models', id);

// ========== 分配先 (Recipient) ==========

export const getAllRecipients = async (): Promise<Recipient[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('recipients').select('*');
  if (error) throw error;
  return (data || []).map(mapToRecipient);
};

export const addRecipient = async (recipient: Omit<Recipient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipient> => {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('recipients')
    .insert({ name: recipient.name, memo: recipient.memo, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return mapToRecipient(data);
};

export const updateRecipient = async (id: string, recipient: Partial<Recipient>): Promise<void> => {
  const supabase = createClient();
  const updateData = pickDefined({ name: recipient.name, memo: recipient.memo, updated_at: new Date().toISOString() });
  const { error } = await supabase.from('recipients').update(updateData).eq('id', id);
  if (error) throw error;
};

export const deleteRecipient = async (id: string): Promise<void> => deleteFromTable('recipients', id);

// ========== カテゴリ (Category) ==========

export const getAllCategories = async (): Promise<Category[]> => {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) {
      if (isTableNotFoundError(error)) {
        console.warn('カテゴリテーブルが存在しません。マイグレーションを実行してください。');
        return [];
      }
      throw error;
    }
    return (data || []).map(mapToCategory);
  } catch (error: any) {
    console.warn('カテゴリデータの取得に失敗:', error?.message || 'Unknown error');
    return [];
  }
};

export const addCategory = async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: category.name,
      color: category.color || '#3b82f6',
      display_order: category.displayOrder || 0,
      memo: category.memo || '',
      user_id: userId,
    })
    .select()
    .single();
    
  if (error) {
    if (isTableNotFoundError(error)) {
      throw new Error('カテゴリテーブルが存在しません。マイグレーションを実行してください。');
    }
    throw error;
  }
  return mapToCategory(data);
};

export const updateCategory = async (id: string, category: Partial<Category>): Promise<void> => {
  const supabase = createClient();
  const updateData = pickDefined({
    name: category.name,
    color: category.color,
    display_order: category.displayOrder,
    memo: category.memo,
    updated_at: new Date().toISOString(),
  });
  const { error } = await supabase.from('categories').update(updateData).eq('id', id);
  if (error) {
    if (isTableNotFoundError(error)) {
      throw new Error('カテゴリテーブルが存在しません。マイグレーションを実行してください。');
    }
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  const supabase = createClient();
  
  // 使用中チェック
  const { data: businesses, error: checkError } = await supabase
    .from('businesses')
    .select('id')
    .eq('category_id', id)
    .limit(1);
  
  if (checkError && !isTableNotFoundError(checkError)) throw checkError;
  if (businesses && businesses.length > 0) {
    throw new Error('このカテゴリを使用している事業があるため削除できません。');
  }
  
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    if (isTableNotFoundError(error)) {
      throw new Error('カテゴリテーブルが存在しません。マイグレーションを実行してください。');
    }
    throw error;
  }
};

// ========== 振り込みステータス (TransferStatus) ==========

export const getAllTransferStatuses = async (): Promise<TransferStatus[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('transfer_statuses').select('*').order('month', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapToTransferStatus);
};

export const getTransferStatus = async (month: string, recipientName: string, businessName = ''): Promise<TransferStatus | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transfer_statuses')
    .select('*')
    .eq('month', month)
    .eq('recipient_name', recipientName)
    .eq('business_name', businessName)
    .single();
  if (error && !isNotFoundError(error)) throw error;
  return data ? mapToTransferStatus(data) : null;
};

export const upsertTransferStatus = async (transferStatus: Omit<TransferStatus, 'id' | 'createdAt' | 'updatedAt'>): Promise<TransferStatus> => {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('transfer_statuses')
    .upsert({
      month: transferStatus.month,
      recipient_name: transferStatus.recipientName,
      business_name: transferStatus.businessName,
      status: transferStatus.status,
      paid_at: transferStatus.paidAt ? transferStatus.paidAt.toISOString() : null,
      memo: transferStatus.memo,
      user_id: userId,
    }, { onConflict: 'month,recipient_name,business_name,user_id' })
    .select()
    .single();
  if (error) throw error;
  return mapToTransferStatus(data);
};

export const updateTransferStatus = async (id: string, status: 'unpaid' | 'paid'): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('transfer_statuses')
    .update({
      status,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
};

export const deleteTransferStatus = async (id: string): Promise<void> => deleteFromTable('transfer_statuses', id);
