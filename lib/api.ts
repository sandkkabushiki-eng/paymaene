// D1 API Client - Firebaseの代わりにAPI経由でD1にアクセス

const API_BASE = '/api';

// ========== 事業管理 ==========
export async function getAllBusinesses() {
  const res = await fetch(`${API_BASE}/businesses`);
  if (!res.ok) throw new Error('事業データの取得に失敗');
  return res.json();
}

export async function addBusiness(data: { name: string; memo: string }) {
  const res = await fetch(`${API_BASE}/businesses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('事業の追加に失敗');
  return res.json();
}

export async function updateBusiness(id: number, data: { name: string; memo: string }) {
  const res = await fetch(`${API_BASE}/businesses`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error('事業の更新に失敗');
  return res.json();
}

export async function deleteBusiness(id: number) {
  const res = await fetch(`${API_BASE}/businesses?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('事業の削除に失敗');
  return res.json();
}

// ========== 経費管理 ==========
export async function getExpenses(options?: { month?: string }) {
  const url = options?.month 
    ? `${API_BASE}/expenses?month=${options.month}`
    : `${API_BASE}/expenses`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('経費データの取得に失敗');
  return res.json();
}

export async function addExpense(data: any) {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('経費の追加に失敗');
  return res.json();
}

export async function updateExpense(id: number, data: any) {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error('経費の更新に失敗');
  return res.json();
}

export async function deleteExpense(id: number) {
  const res = await fetch(`${API_BASE}/expenses?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('経費の削除に失敗');
  return res.json();
}

// ========== 利益管理 ==========
export async function getAllProfits() {
  const res = await fetch(`${API_BASE}/profits`);
  if (!res.ok) throw new Error('利益データの取得に失敗');
  return res.json();
}

export async function getProfit(month: string) {
  const res = await fetch(`${API_BASE}/profits?month=${month}`);
  if (!res.ok) throw new Error('利益データの取得に失敗');
  return res.json();
}

export async function saveProfit(data: any) {
  const res = await fetch(`${API_BASE}/profits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('利益データの保存に失敗');
  return res.json();
}

export async function deleteProfit(month: string) {
  const res = await fetch(`${API_BASE}/profits?month=${month}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('利益データの削除に失敗');
  return res.json();
}

// ========== 支払い元管理 ==========
export async function getAllPaymentSources() {
  const res = await fetch(`${API_BASE}/payment-sources`);
  if (!res.ok) throw new Error('支払い元データの取得に失敗');
  return res.json();
}

export async function addPaymentSource(data: { name: string; memo: string }) {
  const res = await fetch(`${API_BASE}/payment-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('支払い元の追加に失敗');
  return res.json();
}

export async function updatePaymentSource(id: number, data: { name: string; memo: string }) {
  const res = await fetch(`${API_BASE}/payment-sources`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error('支払い元の更新に失敗');
  return res.json();
}

export async function deletePaymentSource(id: number) {
  const res = await fetch(`${API_BASE}/payment-sources?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('支払い元の削除に失敗');
  return res.json();
}

// ========== 経費カテゴリー管理 ==========
export async function getAllExpenseCategories() {
  const res = await fetch(`${API_BASE}/expense-categories`);
  if (!res.ok) throw new Error('経費カテゴリーデータの取得に失敗');
  return res.json();
}

export async function addExpenseCategory(data: { name: string; memo: string }) {
  const res = await fetch(`${API_BASE}/expense-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('経費カテゴリーの追加に失敗');
  return res.json();
}

export async function updateExpenseCategory(id: number, data: { name: string; memo: string }) {
  const res = await fetch(`${API_BASE}/expense-categories`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error('経費カテゴリーの更新に失敗');
  return res.json();
}

export async function deleteExpenseCategory(id: number) {
  const res = await fetch(`${API_BASE}/expense-categories?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('経費カテゴリーの削除に失敗');
  return res.json();
}

// ========== 分配先管理 ==========
export async function getAllRecipients() {
  const res = await fetch(`${API_BASE}/recipients`);
  if (!res.ok) throw new Error('分配先データの取得に失敗');
  return res.json();
}

export async function addRecipient(data: { name: string; memo: string }) {
  const res = await fetch(`${API_BASE}/recipients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('分配先の追加に失敗');
  return res.json();
}

export async function updateRecipient(id: number, data: { name: string; memo: string }) {
  const res = await fetch(`${API_BASE}/recipients`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error('分配先の更新に失敗');
  return res.json();
}

export async function deleteRecipient(id: number) {
  const res = await fetch(`${API_BASE}/recipients?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('分配先の削除に失敗');
  return res.json();
}

// ========== 収益分配管理 ==========
export async function getAllDistributions() {
  const res = await fetch(`${API_BASE}/distributions`);
  if (!res.ok) throw new Error('収益分配データの取得に失敗');
  return res.json();
}

export async function getDistributionsByBusiness(businessName: string) {
  const res = await fetch(`${API_BASE}/distributions?businessName=${encodeURIComponent(businessName)}`);
  if (!res.ok) throw new Error('収益分配データの取得に失敗');
  return res.json();
}

export async function addDistribution(data: any) {
  const res = await fetch(`${API_BASE}/distributions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('収益分配の追加に失敗');
  return res.json();
}

export async function updateDistribution(id: number, data: any) {
  const res = await fetch(`${API_BASE}/distributions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error('収益分配の更新に失敗');
  return res.json();
}

export async function deleteDistribution(id: number) {
  const res = await fetch(`${API_BASE}/distributions?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('収益分配の削除に失敗');
  return res.json();
}

// ========== 資産管理 ==========
export async function getAllAssets() {
  const res = await fetch(`${API_BASE}/assets`);
  if (!res.ok) throw new Error('資産データの取得に失敗');
  return res.json();
}

export async function addAsset(data: any) {
  const res = await fetch(`${API_BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('資産の追加に失敗');
  return res.json();
}

export async function updateAsset(id: number, data: any) {
  const res = await fetch(`${API_BASE}/assets`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error('資産の更新に失敗');
  return res.json();
}

export async function deleteAsset(id: number) {
  const res = await fetch(`${API_BASE}/assets?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('資産の削除に失敗');
  return res.json();
}

