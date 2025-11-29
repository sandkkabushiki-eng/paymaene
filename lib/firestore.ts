import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';

// Timestampを安全にDateに変換するヘルパー関数
function convertTimestampToDate(timestamp: any): Date | string {
  if (!timestamp) return timestamp;
  // Timestampオブジェクトの場合
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  // すでにDateオブジェクトの場合
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // 文字列の場合
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  // その他の場合はそのまま返す
  return timestamp;
}
import { db } from './firebase';
import { Expense, Profit, Asset, PaymentSource, ExpenseCategory, Business, RevenueDistribution, Model, Recipient } from './types';

// ========== 経費管理 ==========

export const expenseCollection = 'expenses';

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db!, expenseCollection), {
    ...expense,
    date: expense.date instanceof Date ? Timestamp.fromDate(expense.date) : expense.date,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateExpense(id: string, expense: Partial<Expense>): Promise<void> {
  const expenseRef = doc(db!, expenseCollection, id);
  const updateData: any = {
    ...expense,
    updatedAt: Timestamp.now(),
  };
  if (expense.date instanceof Date) {
    updateData.date = Timestamp.fromDate(expense.date);
  }
  await updateDoc(expenseRef, updateData);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db!, expenseCollection, id));
}

export async function getExpense(id: string): Promise<Expense | null> {
  const docRef = doc(db!, expenseCollection, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      date: data.date?.toDate() || data.date,
    } as Expense;
  }
  return null;
}

export async function getExpenses(filters?: {
  month?: string;
  business?: string;
}): Promise<Expense[]> {
  if (!db) {
    throw new Error('Firestoreが初期化されていません。Firebase設定を確認してください。');
  }
  
  const constraints: QueryConstraint[] = [];
  
  if (filters?.month) {
    constraints.push(where('month', '==', filters.month));
  }
  if (filters?.business) {
    constraints.push(where('business', '==', filters.business));
  }
  
  // フィルターがある場合はorderByを後で追加、ない場合はorderByのみ
  if (constraints.length > 0) {
    // whereとorderByを組み合わせる場合はインデックスが必要
    // エラーが発生した場合はorderByなしで試行
    try {
      constraints.push(orderBy('date', 'desc'));
      const q = query(collection(db!, expenseCollection), ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: convertTimestampToDate(data.date),
        } as Expense;
      });
    } catch (error: any) {
      // インデックスエラーの場合はorderByなしで再試行
      if (error.code === 'failed-precondition') {
        console.warn('インデックスが必要です。Firebase Consoleでインデックスを作成してください。');
        constraints.pop(); // orderByを削除
        const q = query(collection(db!, expenseCollection), ...constraints);
        const querySnapshot = await getDocs(q);
        const expenses = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: convertTimestampToDate(data.date),
          } as Expense;
        });
        // 日付でソート（クライアント側）
        return expenses.sort((a, b) => {
          const dateA = a.date instanceof Date ? a.date : new Date(a.date);
          const dateB = b.date instanceof Date ? b.date : new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
      }
      throw error;
    }
  } else {
    // フィルターなしの場合はorderByのみ
    const q = query(collection(db!, expenseCollection), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: convertTimestampToDate(data.date),
      } as Expense;
    });
  }
}

export async function getExpensesByMonth(month: string): Promise<Expense[]> {
  return getExpenses({ month });
}

export async function getTotalExpenseByMonth(month: string): Promise<number> {
  const expenses = await getExpensesByMonth(month);
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

// 全月の経費合計を一度に取得（最適化用）
export async function getTotalExpensesByAllMonths(months: string[]): Promise<Map<string, number>> {
  // 全経費データを一度に取得
  const allExpenses = await getExpenses();
  
  // 月ごとに集計
  const expenseMap = new Map<string, number>();
  months.forEach(month => expenseMap.set(month, 0));
  
  allExpenses.forEach(expense => {
    if (expense.month && expenseMap.has(expense.month)) {
      const current = expenseMap.get(expense.month) || 0;
      expenseMap.set(expense.month, current + expense.amount);
    }
  });
  
  return expenseMap;
}

// ========== 利益管理 ==========

export const profitCollection = 'profits';

export async function addProfit(profit: Omit<Profit, 'id'>): Promise<string> {
  // revenuesフィールドを明示的に保存
  const profitData: any = {
    ...profit,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  // revenuesが存在する場合は明示的に設定
  if (profit.revenues !== undefined) {
    profitData.revenues = profit.revenues;
  }
  
  console.log('addProfit - 保存するデータ:', profitData);
  
  const docRef = await addDoc(collection(db!, profitCollection), profitData);
  return docRef.id;
}

export async function updateProfit(id: string, profit: Partial<Profit>): Promise<void> {
  const profitRef = doc(db!, profitCollection, id);
  
  // revenuesフィールドを明示的に保存
  const updateData: any = {
    updatedAt: Timestamp.now(),
  };
  
  // すべてのフィールドを明示的に設定
  if (profit.month !== undefined) {
    updateData.month = profit.month;
  }
  if (profit.revenues !== undefined) {
    updateData.revenues = profit.revenues;
  }
  if (profit.totalRevenue !== undefined) {
    updateData.totalRevenue = profit.totalRevenue;
  }
  if (profit.totalExpense !== undefined) {
    updateData.totalExpense = profit.totalExpense;
  }
  if (profit.grossProfit !== undefined) {
    updateData.grossProfit = profit.grossProfit;
  }
  if (profit.netProfit !== undefined) {
    updateData.netProfit = profit.netProfit;
  }
  
  console.log('updateProfit - 保存するデータ:', { id, month: profit.month, updateData });
  
  await updateDoc(profitRef, updateData);
}

export async function deleteProfit(id: string): Promise<void> {
  await deleteDoc(doc(db!, profitCollection, id));
}

export async function getProfit(month: string): Promise<Profit | null> {
  const q = query(
    collection(db!, profitCollection),
    where('month', '==', month)
  );
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    console.log(`getProfit - ${month}: データが見つかりません`);
    return null;
  }
  
  // 重複データがあるか確認
  if (querySnapshot.docs.length > 1) {
    console.warn(`getProfit - ${month}: 重複データが ${querySnapshot.docs.length} 件あります。最新のデータを使用します。`);
    // 重複データを削除（最新以外）
    const sortedDocs = querySnapshot.docs.sort((a, b) => {
      const aTime = a.data().updatedAt?.toMillis?.() || 0;
      const bTime = b.data().updatedAt?.toMillis?.() || 0;
      return bTime - aTime; // 新しい順
    });
    // 最新以外を削除
    for (let i = 1; i < sortedDocs.length; i++) {
      console.log(`重複データを削除: ${sortedDocs[i].id}`);
      await deleteDoc(doc(db!, profitCollection, sortedDocs[i].id));
    }
  }
  
  const docSnap = querySnapshot.docs[0];
  const data = docSnap.data();
  
  const revenues = data.revenues || {};
  
  console.log(`getProfit - ${month}:`, {
    id: docSnap.id,
    revenues,
    revenuesType: typeof revenues,
    revenuesKeys: Object.keys(revenues)
  });
  
  // revenuesフィールドが正しく取得されているか確認
  const profit: Profit = {
    id: docSnap.id,
    month: data.month,
    revenues: revenues,
    totalRevenue: data.totalRevenue || 0,
    totalExpense: data.totalExpense || 0,
    grossProfit: data.grossProfit || 0,
    netProfit: data.netProfit || 0,
    // 後方互換性のため残す
    myfansRevenue: data.myfansRevenue,
    hijozokuRevenue: data.hijozokuRevenue,
    coconalaRevenue: data.coconalaRevenue,
  };
  
  return profit;
}

export async function getAllProfits(): Promise<Profit[]> {
  const q = query(collection(db!, profitCollection), orderBy('month', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    const revenues = data.revenues || {};
    
    console.log(`getAllProfits - ${data.month}:`, { 
      id: doc.id, 
      month: data.month, 
      revenues,
      revenuesType: typeof revenues,
      revenuesKeys: Object.keys(revenues)
    });
    
    return {
      id: doc.id,
      month: data.month,
      revenues: revenues, // revenuesを明示的に取得
      totalRevenue: data.totalRevenue || 0,
      totalExpense: data.totalExpense || 0,
      grossProfit: data.grossProfit || 0,
      netProfit: data.netProfit || 0,
      // 後方互換性のため残す
      myfansRevenue: data.myfansRevenue,
      hijozokuRevenue: data.hijozokuRevenue,
      coconalaRevenue: data.coconalaRevenue,
    } as Profit;
  });
}

export async function calculateProfitForMonth(month: string): Promise<Profit> {
  // 既存の利益データを取得
  const existingProfit = await getProfit(month);
  
  // 動的な売上データを取得（既存データとの互換性のため）
  let revenues: Record<string, number> = existingProfit?.revenues || {};
  
  // 後方互換性: 既存の固定フィールドがあればrevenuesに移行
  if (existingProfit?.myfansRevenue !== undefined && !revenues['MyFans']) {
    revenues['MyFans'] = existingProfit.myfansRevenue;
  }
  if (existingProfit?.hijozokuRevenue !== undefined && !revenues['非属人人']) {
    revenues['非属人人'] = existingProfit.hijozokuRevenue;
  }
  if (existingProfit?.coconalaRevenue !== undefined && !revenues['ココナラ']) {
    revenues['ココナラ'] = existingProfit.coconalaRevenue;
  }
  
  // 経費合計を計算
  const totalExpense = await getTotalExpenseByMonth(month);
  
  // 売上合計を計算
  const totalRevenue = Object.values(revenues).reduce((sum, rev) => sum + (rev || 0), 0);
  const grossProfit = totalRevenue; // 現時点では粗利=売上合計（原価なし）
  const netProfit = totalRevenue - totalExpense;
  
  return {
    id: existingProfit?.id,
    month,
    revenues: Object.keys(revenues).length > 0 ? revenues : undefined,
    totalRevenue,
    totalExpense,
    grossProfit,
    netProfit,
  };
}

// 複数月の利益を一度に計算（最適化用）
export async function calculateProfitsForMonths(months: string[]): Promise<Profit[]> {
  // 既存の利益データを一度に取得
  const allProfits = await getAllProfits();
  const profitsMap = new Map(allProfits.map(p => [p.month, p]));
  
  // 経費データを一度に取得して月ごとに集計
  const expenseMap = await getTotalExpensesByAllMonths(months);
  
  // 各月の利益を計算
  return months.map(month => {
    const existingProfit = profitsMap.get(month);
    
    // 動的な売上データを取得（既存データとの互換性のため）
    // revenuesが存在する場合はそれを優先、存在しない場合は空オブジェクト
    let revenues: Record<string, number> = {};
    
    if (existingProfit) {
      // 既存のrevenuesを優先的に使用
      if (existingProfit.revenues && typeof existingProfit.revenues === 'object') {
        revenues = { ...existingProfit.revenues };
      }
      
      // 後方互換性: 既存の固定フィールドがあればrevenuesに移行（revenuesに既に値がない場合のみ）
      if (existingProfit.myfansRevenue !== undefined && revenues['MyFans'] === undefined) {
        revenues['MyFans'] = existingProfit.myfansRevenue;
      }
      if (existingProfit.hijozokuRevenue !== undefined && revenues['非属人人'] === undefined) {
        revenues['非属人人'] = existingProfit.hijozokuRevenue;
      }
      if (existingProfit.coconalaRevenue !== undefined && revenues['ココナラ'] === undefined) {
        revenues['ココナラ'] = existingProfit.coconalaRevenue;
      }
    }
    
    const totalExpense = expenseMap.get(month) || 0;
    
    // 売上合計を計算
    const totalRevenue = Object.values(revenues).reduce((sum, rev) => sum + (rev || 0), 0);
    const grossProfit = totalRevenue;
    const netProfit = totalRevenue - totalExpense;
    
    const result = {
      id: existingProfit?.id,
      month,
      revenues: revenues, // 空でも必ずオブジェクトを返す
      totalRevenue,
      totalExpense,
      grossProfit,
      netProfit,
    };
    
    return result;
  });
}

// ========== 支払い元管理 ==========

export const paymentSourceCollection = 'paymentSources';

export async function addPaymentSource(paymentSource: Omit<PaymentSource, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db!, paymentSourceCollection), {
    ...paymentSource,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updatePaymentSource(id: string, paymentSource: Partial<PaymentSource>): Promise<void> {
  const paymentSourceRef = doc(db!, paymentSourceCollection, id);
  await updateDoc(paymentSourceRef, {
    ...paymentSource,
    updatedAt: Timestamp.now(),
  });
}

export async function deletePaymentSource(id: string): Promise<void> {
  await deleteDoc(doc(db!, paymentSourceCollection, id));
}

export async function getPaymentSource(id: string): Promise<PaymentSource | null> {
  const docRef = doc(db!, paymentSourceCollection, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as PaymentSource;
  }
  return null;
}

export async function getAllPaymentSources(): Promise<PaymentSource[]> {
  const q = query(collection(db!, paymentSourceCollection), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as PaymentSource));
}

// ========== 経費カテゴリー管理 ==========

export const expenseCategoryCollection = 'expenseCategories';

export async function addExpenseCategory(category: Omit<ExpenseCategory, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db!, expenseCategoryCollection), {
    ...category,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateExpenseCategory(id: string, category: Partial<ExpenseCategory>): Promise<void> {
  const categoryRef = doc(db!, expenseCategoryCollection, id);
  await updateDoc(categoryRef, {
    ...category,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  await deleteDoc(doc(db!, expenseCategoryCollection, id));
}

export async function getExpenseCategory(id: string): Promise<ExpenseCategory | null> {
  const docRef = doc(db!, expenseCategoryCollection, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as ExpenseCategory;
  }
  return null;
}

export async function getAllExpenseCategories(): Promise<ExpenseCategory[]> {
  const q = query(collection(db!, expenseCategoryCollection), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as ExpenseCategory));
}

// ========== 事業管理 ==========

export const businessCollection = 'businesses';

export async function addBusiness(business: Omit<Business, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db!, businessCollection), {
    ...business,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateBusiness(id: string, business: Partial<Business>): Promise<void> {
  const businessRef = doc(db!, businessCollection, id);
  await updateDoc(businessRef, {
    ...business,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteBusiness(id: string): Promise<void> {
  await deleteDoc(doc(db!, businessCollection, id));
}

export async function getBusiness(id: string): Promise<Business | null> {
  const docRef = doc(db!, businessCollection, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Business;
  }
  return null;
}

export async function getAllBusinesses(): Promise<Business[]> {
  const q = query(collection(db!, businessCollection), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Business));
}

// ========== 資産管理 ==========

export const assetCollection = 'assets';

export async function addAsset(asset: Omit<Asset, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db!, assetCollection), {
    ...asset,
    updateDate: asset.updateDate instanceof Date 
      ? Timestamp.fromDate(asset.updateDate) 
      : asset.updateDate,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateAsset(id: string, asset: Partial<Asset>): Promise<void> {
  const assetRef = doc(db!, assetCollection, id);
  const updateData: any = {
    ...asset,
    updatedAt: Timestamp.now(),
  };
  if (asset.updateDate instanceof Date) {
    updateData.updateDate = Timestamp.fromDate(asset.updateDate);
  }
  await updateDoc(assetRef, updateData);
}

export async function deleteAsset(id: string): Promise<void> {
  await deleteDoc(doc(db!, assetCollection, id));
}

export async function getAsset(id: string): Promise<Asset | null> {
  const docRef = doc(db!, assetCollection, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      updateDate: convertTimestampToDate(data.updateDate),
    } as Asset;
  }
  return null;
}

export async function getAllAssets(): Promise<Asset[]> {
  const q = query(collection(db!, assetCollection), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      updateDate: convertTimestampToDate(data.updateDate),
    } as Asset;
  });
}

// ========== 収益分配管理 ==========

export const revenueDistributionCollection = 'revenueDistributions';

export async function addRevenueDistribution(distribution: Omit<RevenueDistribution, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db!, revenueDistributionCollection), {
    ...distribution,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateRevenueDistribution(id: string, distribution: Partial<RevenueDistribution>): Promise<void> {
  const distributionRef = doc(db!, revenueDistributionCollection, id);
  await updateDoc(distributionRef, {
    ...distribution,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteRevenueDistribution(id: string): Promise<void> {
  await deleteDoc(doc(db!, revenueDistributionCollection, id));
}

export async function getRevenueDistribution(id: string): Promise<RevenueDistribution | null> {
  const docRef = doc(db!, revenueDistributionCollection, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as RevenueDistribution;
  }
  return null;
}

export async function getAllRevenueDistributions(): Promise<RevenueDistribution[]> {
  const q = query(collection(db!, revenueDistributionCollection), orderBy('businessName', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as RevenueDistribution));
}

export async function getRevenueDistributionsByBusiness(businessName: string): Promise<RevenueDistribution[]> {
  const q = query(
    collection(db!, revenueDistributionCollection),
    where('businessName', '==', businessName),
    orderBy('createdAt', 'asc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as RevenueDistribution));
}

export async function getRevenueDistributionsByModel(businessName: string, modelName: string): Promise<RevenueDistribution[]> {
  try {
    const q = query(
      collection(db!, revenueDistributionCollection),
      where('businessName', '==', businessName),
      where('modelName', '==', modelName),
      orderBy('createdAt', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as RevenueDistribution));
  } catch (error: any) {
    console.error('モデル別収益分配データの取得に失敗:', error);
    // インデックスエラーの場合、orderByなしで取得を試みる
    try {
      const q = query(
        collection(db!, revenueDistributionCollection),
        where('businessName', '==', businessName),
        where('modelName', '==', modelName)
      );
      const querySnapshot = await getDocs(q);
      const distributions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as RevenueDistribution));
      // クライアント側でソート
      return distributions.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return aTime - bTime;
      });
    } catch (fallbackError) {
      console.error('フォールバック取得も失敗:', fallbackError);
      throw new Error(`モデル別収益分配データの取得に失敗しました: ${error?.message || '不明なエラー'}`);
    }
  }
}

// ========== モデル管理 ==========

export const modelCollection = 'models';

export async function addModel(model: Omit<Model, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db!, modelCollection), {
    ...model,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateModel(id: string, model: Partial<Model>): Promise<void> {
  const modelRef = doc(db!, modelCollection, id);
  await updateDoc(modelRef, {
    ...model,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteModel(id: string): Promise<void> {
  await deleteDoc(doc(db!, modelCollection, id));
}

export async function getModel(id: string): Promise<Model | null> {
  const docRef = doc(db!, modelCollection, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Model;
  }
  return null;
}

export async function getAllModels(): Promise<Model[]> {
  try {
    // 単一のorderByを使用（複数のorderByはインデックスが必要な場合があるため）
    const q = query(collection(db!, modelCollection), orderBy('businessName', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const models = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Model));
    
    // クライアント側でnameでソート
    return models.sort((a, b) => {
      if (a.businessName !== b.businessName) {
        return a.businessName.localeCompare(b.businessName);
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error: any) {
    console.error('モデルデータの取得に失敗:', error);
    // エラーが発生した場合は、orderByなしで取得を試みる
    try {
      const q = query(collection(db!, modelCollection));
      const querySnapshot = await getDocs(q);
      const models = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Model));
      // クライアント側でソート
      return models.sort((a, b) => {
        if (a.businessName !== b.businessName) {
          return a.businessName.localeCompare(b.businessName);
        }
        return a.name.localeCompare(b.name);
      });
    } catch (fallbackError) {
      console.error('フォールバック取得も失敗:', fallbackError);
      throw new Error(`モデルデータの取得に失敗しました: ${error?.message || '不明なエラー'}`);
    }
  }
}

export async function getModelsByBusiness(businessId: string): Promise<Model[]> {
  const q = query(
    collection(db!, modelCollection),
    where('businessId', '==', businessId),
    orderBy('name', 'asc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Model));
}

export async function getModelsByBusinessName(businessName: string): Promise<Model[]> {
  const q = query(
    collection(db!, modelCollection),
    where('businessName', '==', businessName),
    orderBy('name', 'asc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Model));
}

// ========== 分配先管理 ==========

export const recipientCollection = 'recipients';

export async function addRecipient(recipient: Omit<Recipient, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db!, recipientCollection), {
    ...recipient,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateRecipient(id: string, recipient: Partial<Recipient>): Promise<void> {
  const recipientRef = doc(db!, recipientCollection, id);
  await updateDoc(recipientRef, {
    ...recipient,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteRecipient(id: string): Promise<void> {
  await deleteDoc(doc(db!, recipientCollection, id));
}

export async function getRecipient(id: string): Promise<Recipient | null> {
  const docRef = doc(db!, recipientCollection, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Recipient;
  }
  return null;
}

export async function getAllRecipients(): Promise<Recipient[]> {
  const q = query(collection(db!, recipientCollection), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Recipient));
}

