import { createClient } from './supabase';
import { 
  Business, PaymentSource, ExpenseCategory, Recipient, 
  Expense, Profit, Asset, RevenueDistribution, Model, TransferStatus 
} from './types';

// formatDateForDB は supabase.ts に定義してあると仮定、またはここで定義
const formatDateForDB = (date: Date | string): string => {
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return date;
};

// ========== 事業 (Business) ==========

export const getAllBusinesses = async (): Promise<Business[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data.map((d: any) => ({
    id: d.id,
    name: d.name,
    memo: d.memo,
    color: d.color,
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
  }));
};

export const addBusiness = async (business: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Promise<Business> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('businesses')
    .insert({
      name: business.name,
      memo: business.memo,
      color: business.color,
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    memo: data.memo,
    color: data.color,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const updateBusiness = async (id: string, business: Partial<Business>): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('businesses')
    .update({
      name: business.name,
      memo: business.memo,
      color: business.color,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
    
  if (error) throw error;
};

export const deleteBusiness = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('businesses')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

export const getBusiness = async (id: string): Promise<Business | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) return null;
  return {
    id: data.id,
    name: data.name,
    memo: data.memo,
    color: data.color,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

// ========== 経費 (Expense) ==========

export const getExpenses = async (options?: { month?: string }): Promise<Expense[]> => {
  const supabase = createClient();
  let query = supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });
    
  if (options?.month) {
    query = query.eq('month', options.month);
  }
    
  const { data, error } = await query;
    
  if (error) throw error;
  return data.map((d: any) => ({
    id: d.id,
    date: new Date(d.date),
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
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
  }));
};

export const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> => {
  const supabase = createClient();
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
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    date: new Date(data.date),
    month: data.month,
    business: data.business,
    paymentSource: data.payment_source,
    category: data.category,
    description: data.description,
    amount: data.amount,
    memo: data.memo,
    sourceData: data.source_data,
    isFixedCost: data.is_fixed_cost,
    fixedCostId: data.fixed_cost_id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const updateExpense = async (id: string, expense: Partial<Expense>): Promise<void> => {
  const supabase = createClient();
  
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  
  if (expense.date) updateData.date = formatDateForDB(expense.date);
  if (expense.month) updateData.month = expense.month;
  if (expense.business) updateData.business = expense.business;
  if (expense.paymentSource) updateData.payment_source = expense.paymentSource;
  if (expense.category) updateData.category = expense.category;
  if (expense.description) updateData.description = expense.description;
  if (expense.amount !== undefined) updateData.amount = expense.amount;
  if (expense.memo) updateData.memo = expense.memo;
  if (expense.isFixedCost !== undefined) updateData.is_fixed_cost = expense.isFixedCost;
  
  const { error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id);
    
  if (error) throw error;
};

export const deleteExpense = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

export const getExpense = async (id: string): Promise<Expense | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) return null;
  return {
    id: data.id,
    date: new Date(data.date),
    month: data.month,
    business: data.business,
    paymentSource: data.payment_source,
    category: data.category,
    description: data.description,
    amount: data.amount,
    memo: data.memo,
    sourceData: data.source_data,
    isFixedCost: data.is_fixed_cost,
    fixedCostId: data.fixed_cost_id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

// ========== 利益 (Profit) ==========

export const getAllProfits = async (): Promise<Profit[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profits')
    .select('*')
    .order('month', { ascending: false });
    
  if (error) throw error;
  return data.map((d: any) => ({
    id: d.id,
    month: d.month,
    revenues: d.revenues,
    totalRevenue: d.total_revenue,
    totalExpense: d.total_expense,
    grossProfit: d.gross_profit,
    netProfit: d.net_profit,
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
  }));
};

export const getProfit = async (month: string): Promise<Profit | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profits')
    .select('*')
    .eq('month', month)
    .single();
    
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows found
  if (!data) return null;
  
  return {
    id: data.id,
    month: data.month,
    revenues: data.revenues,
    totalRevenue: data.total_revenue,
    totalExpense: data.total_expense,
    grossProfit: data.gross_profit,
    netProfit: data.net_profit,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const addProfit = async (profit: Omit<Profit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Profit> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profits')
    .insert({
      month: profit.month,
      revenues: profit.revenues,
      total_revenue: profit.totalRevenue,
      total_expense: profit.totalExpense,
      gross_profit: profit.grossProfit,
      net_profit: profit.netProfit,
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    month: data.month,
    revenues: data.revenues,
    totalRevenue: data.total_revenue,
    totalExpense: data.total_expense,
    grossProfit: data.gross_profit,
    netProfit: data.net_profit,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const updateProfit = async (id: string, profit: Partial<Profit>): Promise<void> => {
  const supabase = createClient();
  
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  
  if (profit.revenues) updateData.revenues = profit.revenues;
  if (profit.totalRevenue !== undefined) updateData.total_revenue = profit.totalRevenue;
  if (profit.totalExpense !== undefined) updateData.total_expense = profit.totalExpense;
  if (profit.grossProfit !== undefined) updateData.gross_profit = profit.grossProfit;
  if (profit.netProfit !== undefined) updateData.net_profit = profit.netProfit;
  
  const { error } = await supabase
    .from('profits')
    .update(updateData)
    .eq('id', id);
    
  if (error) throw error;
};

export const deleteProfit = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('profits')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

export const calculateProfitForMonth = async (month: string): Promise<Omit<Profit, 'id' | 'createdAt' | 'updatedAt'>> => {
  // 1. 売上取得 (profitsテーブルから既存のrevenuesを取得)
  const existingProfit = await getProfit(month);
  const revenues = existingProfit?.revenues || {};
  
  // 2. 経費合計計算
  const supabase = createClient();
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('amount')
    .eq('month', month);
    
  if (error) throw error;
  
  const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // 3. 売上合計計算
  const totalRevenue = Object.values(revenues).reduce((sum, rev) => sum + (rev as number), 0);
  
  // 4. 利益計算
  const grossProfit = totalRevenue - totalExpense;
  const netProfit = grossProfit; // 税金計算はここでは行わない（UI側で処理するか、必要ならここに追加）
  
  return {
    month,
    revenues,
    totalRevenue,
    totalExpense,
    grossProfit,
    netProfit,
  };
};

// ========== 支払い元 (PaymentSource) ==========

export const getAllPaymentSources = async (): Promise<PaymentSource[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('payment_sources')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data.map((d: any) => ({
    id: d.id,
    name: d.name,
    memo: d.memo,
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
  }));
};

export const addPaymentSource = async (source: Omit<PaymentSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentSource> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('payment_sources')
    .insert({
      name: source.name,
      memo: source.memo,
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    memo: data.memo,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const updatePaymentSource = async (id: string, source: Partial<PaymentSource>): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('payment_sources')
    .update({
      name: source.name,
      memo: source.memo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
    
  if (error) throw error;
};

export const deletePaymentSource = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('payment_sources')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// ========== 経費カテゴリー (ExpenseCategory) ==========

export const getAllExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data.map((d: any) => ({
    id: d.id,
    name: d.name,
    memo: d.memo,
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
  }));
};

export const addExpenseCategory = async (category: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseCategory> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({
      name: category.name,
      memo: category.memo,
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    memo: data.memo,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const updateExpenseCategory = async (id: string, category: Partial<ExpenseCategory>): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('expense_categories')
    .update({
      name: category.name,
      memo: category.memo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
    
  if (error) throw error;
};

export const deleteExpenseCategory = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// ========== 資産 (Asset) ==========

export const getAllAssets = async (): Promise<Asset[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data.map((d: any) => ({
    id: d.id,
    assetType: d.asset_type,
    name: d.name,
    affiliation: d.affiliation,
    currentBalance: d.current_balance,
    currency: d.currency,
    updateDate: new Date(d.update_date),
    memo: d.memo,
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
  }));
};

export const addAsset = async (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> => {
  const supabase = createClient();
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
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    assetType: data.asset_type,
    name: data.name,
    affiliation: data.affiliation,
    currentBalance: data.current_balance,
    currency: data.currency,
    updateDate: new Date(data.update_date),
    memo: data.memo,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const updateAsset = async (id: string, asset: Partial<Asset>): Promise<void> => {
  const supabase = createClient();
  
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  
  if (asset.assetType) updateData.asset_type = asset.assetType;
  if (asset.name) updateData.name = asset.name;
  if (asset.affiliation) updateData.affiliation = asset.affiliation;
  if (asset.currentBalance !== undefined) updateData.current_balance = asset.currentBalance;
  if (asset.currency) updateData.currency = asset.currency;
  if (asset.updateDate) updateData.update_date = formatDateForDB(asset.updateDate);
  if (asset.memo) updateData.memo = asset.memo;
  
  const { error } = await supabase
    .from('assets')
    .update(updateData)
    .eq('id', id);
    
  if (error) throw error;
};

export const deleteAsset = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// ========== 収益分配 (RevenueDistribution) ==========

export const getAllRevenueDistributions = async (): Promise<RevenueDistribution[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('revenue_distributions')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data.map((d: any) => ({
    id: d.id,
    businessName: d.business_name,
    modelName: d.model_name,
    recipientName: d.recipient_name,
    distributionType: d.distribution_type,
    value: d.value,
    memo: d.memo,
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
  }));
};

export const addRevenueDistribution = async (dist: Omit<RevenueDistribution, 'id' | 'createdAt' | 'updatedAt'>): Promise<RevenueDistribution> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('revenue_distributions')
    .insert({
      business_name: dist.businessName,
      model_name: dist.modelName,
      recipient_name: dist.recipientName,
      distribution_type: dist.distributionType,
      value: dist.value,
      memo: dist.memo,
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    businessName: data.business_name,
    modelName: data.model_name,
    recipientName: data.recipient_name,
    distributionType: data.distribution_type,
    value: data.value,
    memo: data.memo,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const updateRevenueDistribution = async (id: string, dist: Partial<RevenueDistribution>): Promise<void> => {
  const supabase = createClient();
  
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  
  if (dist.businessName) updateData.business_name = dist.businessName;
  if (dist.modelName) updateData.model_name = dist.modelName;
  if (dist.recipientName) updateData.recipient_name = dist.recipientName;
  if (dist.distributionType) updateData.distribution_type = dist.distributionType;
  if (dist.value !== undefined) updateData.value = dist.value;
  if (dist.memo) updateData.memo = dist.memo;
  
  const { error } = await supabase
    .from('revenue_distributions')
    .update(updateData)
    .eq('id', id);
    
  if (error) throw error;
};

export const deleteRevenueDistribution = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('revenue_distributions')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// ========== モデル (Model) ==========

export const getAllModels = async (): Promise<Model[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data.map((d: any) => ({
    id: d.id,
    businessId: d.business_id,
    businessName: d.business_name,
    name: d.name,
    memo: d.memo,
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
  }));
};

export const addModel = async (model: Omit<Model, 'id' | 'createdAt' | 'updatedAt'>): Promise<Model> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('models')
    .insert({
      business_id: model.businessId,
      business_name: model.businessName,
      name: model.name,
      memo: model.memo,
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    businessId: data.business_id,
    businessName: data.business_name,
    name: data.name,
    memo: data.memo,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const updateModel = async (id: string, model: Partial<Model>): Promise<void> => {
  const supabase = createClient();
  
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  
  if (model.businessId) updateData.business_id = model.businessId;
  if (model.businessName) updateData.business_name = model.businessName;
  if (model.name) updateData.name = model.name;
  if (model.memo) updateData.memo = model.memo;
  
  const { error } = await supabase
    .from('models')
    .update(updateData)
    .eq('id', id);
    
  if (error) throw error;
};

export const deleteModel = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('models')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// ========== 共通 ==========

// 分配先一覧（recipients + payment_sources）を取得
export const getAllRecipients = async (): Promise<Recipient[]> => {
  const supabase = createClient();
  
  // recipientsテーブルから取得
  const { data: recipientsData, error: recipientsError } = await supabase
    .from('recipients')
    .select('*');
    
  if (recipientsError) throw recipientsError;
  
  const recipients: Recipient[] = recipientsData.map((d: any) => ({
    id: d.id,
    name: d.name,
    memo: d.memo,
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
  }));
  
  return recipients;
};

export const addRecipient = async (recipient: Omit<Recipient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipient> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('recipients')
    .insert({
      name: recipient.name,
      memo: recipient.memo,
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    memo: data.memo,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const updateRecipient = async (id: string, recipient: Partial<Recipient>): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('recipients')
    .update({
      name: recipient.name,
      memo: recipient.memo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
    
  if (error) throw error;
};

export const deleteRecipient = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('recipients')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// ========== 振り込みステータス (TransferStatus) ==========

export const getAllTransferStatuses = async (): Promise<TransferStatus[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transfer_statuses')
    .select('*')
    .order('month', { ascending: false });
    
  if (error) throw error;
  return data.map((d: any) => ({
    id: d.id,
    month: d.month,
    recipientName: d.recipient_name,
    businessName: d.business_name,
    status: d.status,
    paidAt: d.paid_at ? new Date(d.paid_at) : null,
    memo: d.memo,
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
  }));
};

export const getTransferStatus = async (month: string, recipientName: string, businessName: string = ''): Promise<TransferStatus | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transfer_statuses')
    .select('*')
    .eq('month', month)
    .eq('recipient_name', recipientName)
    .eq('business_name', businessName)
    .single();
    
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  
  return {
    id: data.id,
    month: data.month,
    recipientName: data.recipient_name,
    businessName: data.business_name,
    status: data.status,
    paidAt: data.paid_at ? new Date(data.paid_at) : null,
    memo: data.memo,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const upsertTransferStatus = async (transferStatus: Omit<TransferStatus, 'id' | 'createdAt' | 'updatedAt'>): Promise<TransferStatus> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transfer_statuses')
    .upsert({
      month: transferStatus.month,
      recipient_name: transferStatus.recipientName,
      business_name: transferStatus.businessName,
      status: transferStatus.status,
      paid_at: transferStatus.paidAt ? transferStatus.paidAt.toISOString() : null,
      memo: transferStatus.memo,
    }, {
      onConflict: 'month,recipient_name,business_name'
    })
    .select()
    .single();
    
  if (error) throw error;
  return {
    id: data.id,
    month: data.month,
    recipientName: data.recipient_name,
    businessName: data.business_name,
    status: data.status,
    paidAt: data.paid_at ? new Date(data.paid_at) : null,
    memo: data.memo,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
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

export const deleteTransferStatus = async (id: string): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase
    .from('transfer_statuses')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};
