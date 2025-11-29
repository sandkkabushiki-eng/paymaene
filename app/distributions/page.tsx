'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAllBusinesses, getAllPaymentSources, getExpenses } from '@/lib/firestore';
import { Business, PaymentSource } from '@/lib/types';

interface Distribution {
  id?: string;
  businessName: string;
  recipientName: string;
  distributionType: 'percentage' | 'amount';
  value: number;
}

interface ExpenseItem {
  description: string;
  category: string;
  amount: number;
  paymentSource: string;
}

export default function DistributionsPage() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [monthlyData, setMonthlyData] = useState<Record<string, { revenue: number; expense: number; profit: number }>>({});
  const [expenseItems, setExpenseItems] = useState<Record<string, ExpenseItem[]>>({});
  const [expensesByPayer, setExpensesByPayer] = useState<Record<string, { name: string; amount: number }[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!db) {
        console.error('Firebase DBが初期化されていません');
        setLoading(false);
        return;
      }
      
      const [businessData, paymentSourceData, expenseData] = await Promise.all([
        getAllBusinesses(),
        getAllPaymentSources(),
        getExpenses(),
      ]);
      
      setBusinesses(businessData);
      setPaymentSources(paymentSourceData);
      
      // 分配設定を取得
      const distSnapshot = await getDocs(query(collection(db!, 'revenueDistributions')));
      setDistributions(distSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Distribution[]);
      
      // 利益データを取得
      const profitSnapshot = await getDocs(query(collection(db!, 'profits')));
      
      // 月・事業別データを構築
      const data: Record<string, Record<string, { revenue: number; expense: number; profit: number }>> = {};
      const expByPayer: Record<string, Record<string, { name: string; amount: number }[]>> = {};
      const expItems: Record<string, Record<string, ExpenseItem[]>> = {};
      
      // 利益データから売上を取得
      profitSnapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        const month = d.month;
        const revenues = d.revenues || {};
        
        if (!data[month]) data[month] = {};
        
        Object.entries(revenues).forEach(([biz, rev]) => {
          if (!data[month][biz]) data[month][biz] = { revenue: 0, expense: 0, profit: 0 };
          data[month][biz].revenue = rev as number;
        });
      });
      
      // 経費データを追加
      expenseData.forEach((exp: any) => {
        const month = exp.month;
        const biz = exp.business;
        const payer = exp.paymentSource || '不明';
        
        if (!data[month]) data[month] = {};
        if (!data[month][biz]) data[month][biz] = { revenue: 0, expense: 0, profit: 0 };
        data[month][biz].expense += exp.amount;
        
        // 経費内訳
        if (!expItems[month]) expItems[month] = {};
        if (!expItems[month][biz]) expItems[month][biz] = [];
        expItems[month][biz].push({
          description: exp.description || exp.category || '経費',
          category: exp.category || '',
          amount: exp.amount,
          paymentSource: payer,
        });
        
        // 立て替え者ごとに集計
        if (!expByPayer[month]) expByPayer[month] = {};
        if (!expByPayer[month][biz]) expByPayer[month][biz] = [];
        
        const existing = expByPayer[month][biz].find(p => p.name === payer);
        if (existing) existing.amount += exp.amount;
        else expByPayer[month][biz].push({ name: payer, amount: exp.amount });
      });
      
      // 利益計算
      Object.keys(data).forEach(month => {
        Object.keys(data[month]).forEach(biz => {
          data[month][biz].profit = data[month][biz].revenue - data[month][biz].expense;
        });
      });
      
      // フラットなデータに変換（月_事業をキーに）
      const flatData: Record<string, { revenue: number; expense: number; profit: number }> = {};
      const flatExp: Record<string, { name: string; amount: number }[]> = {};
      const flatItems: Record<string, ExpenseItem[]> = {};
      
      Object.keys(data).forEach(month => {
        Object.keys(data[month]).forEach(biz => {
          flatData[`${month}_${biz}`] = data[month][biz];
        });
      });
      
      Object.keys(expByPayer).forEach(month => {
        Object.keys(expByPayer[month]).forEach(biz => {
          flatExp[`${month}_${biz}`] = expByPayer[month][biz];
        });
      });
      
      Object.keys(expItems).forEach(month => {
        Object.keys(expItems[month]).forEach(biz => {
          flatItems[`${month}_${biz}`] = expItems[month][biz];
        });
      });
      
      setMonthlyData(flatData);
      setExpensesByPayer(flatExp);
      setExpenseItems(flatItems);
      
      // デフォルト選択
      if (businessData.length > 0) setSelectedBusiness(businessData[0].name);
      const months = [...new Set(Object.keys(data))].sort().reverse();
      if (months.length > 0) setSelectedMonth(months[0]);
      
    } catch (error) {
      console.error('データの読み込みに失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 月リスト生成
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2025, 9 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const key = `${selectedMonth}_${selectedBusiness}`;
  const data = monthlyData[key] || { revenue: 0, expense: 0, profit: 0 };
  const payers = expensesByPayer[key] || [];
  const items = expenseItems[key] || [];
  const dists = distributions.filter(d => d.businessName === selectedBusiness);
  
  // 固定金額合計
  const totalFixed = dists.filter(d => d.distributionType === 'amount').reduce((s, d) => s + d.value, 0);
  // 固定金額を引いた後の残り
  const profitAfterFixed = data.profit - totalFixed;
  
  // 分配金額を計算
  const calcAmount = (d: Distribution) => {
    if (d.distributionType === 'amount') return d.value;
    return Math.floor(profitAfterFixed * d.value / 100);
  };

  const handleAdd = async () => {
    const name = prompt('分配先を選択（名前を入力）:');
    if (!name) return;
    
    const type = confirm('パーセンテージで分配しますか？\n（キャンセルで固定金額）') ? 'percentage' : 'amount';
    const valueStr = prompt(type === 'percentage' ? '何%？' : '金額は？');
    const value = parseFloat(valueStr || '0');
    if (!value) return;
    
    await addDoc(collection(db!, 'revenueDistributions'), {
      businessName: selectedBusiness,
      recipientName: name,
      distributionType: type,
      value,
      createdAt: new Date(),
    });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return;
    await deleteDoc(doc(db!, 'revenueDistributions', id));
    loadData();
  };

  const handleValueChange = async (d: Distribution, newValue: number) => {
    if (!d.id) return;
    await updateDoc(doc(db!, 'revenueDistributions', d.id), { value: newValue });
  };

  if (loading) return <div className="min-h-screen bg-gray-50 p-8">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">収益分配</h1>
          <Link href="/" className="text-blue-600 hover:underline text-sm">← ホーム</Link>
        </div>

        {/* 月・事業選択 */}
        <div className="bg-white p-4 rounded-lg shadow mb-4 flex gap-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 border rounded px-3 py-2 text-gray-900 bg-white"
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="flex-1 border rounded px-3 py-2 text-gray-900 bg-white"
          >
            {businesses.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>

        {/* 計算サマリー */}
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-500">売上</div>
              <div className="text-xl font-bold text-green-600">¥{data.revenue.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">経費</div>
              <div className="text-xl font-bold text-red-600">¥{data.expense.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">利益</div>
              <div className={`text-xl font-bold ${data.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ¥{data.profit.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 経費内訳 */}
        {items.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">経費内訳</div>
            <div className="space-y-1 mb-3">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                  <span className="text-gray-700">{item.description || item.category}</span>
                  <span className="text-gray-900">¥{item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span className="text-gray-900">経費合計</span>
              <span className="text-red-600">¥{data.expense.toLocaleString()}</span>
            </div>
            {/* 立て替え者 */}
            {payers.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-500 mb-2">立て替え</div>
                {payers.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="text-gray-700">{p.name}</span>
                    <span className="text-orange-600 font-medium">¥{p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 利益分配 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-semibold text-gray-700">利益分配</div>
            <button
              onClick={handleAdd}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              + 追加
            </button>
          </div>
          
          {dists.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">分配設定なし</p>
          ) : (
            <div className="space-y-2">
              {/* 固定金額 */}
              {dists.filter(d => d.distributionType === 'amount').map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-900">{d.recipientName}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={d.value}
                      onChange={(e) => setDistributions(prev => prev.map(x => x.id === d.id ? { ...x, value: parseFloat(e.target.value) || 0 } : x))}
                      onBlur={(e) => handleValueChange(d, parseFloat(e.target.value) || 0)}
                      className="w-24 text-right border rounded px-2 py-1 text-sm text-gray-900 bg-white"
                    />
                    <span className="text-gray-500 text-sm w-6">円</span>
                    <span className="text-orange-600 font-medium w-28 text-right">−¥{d.value.toLocaleString()}</span>
                    <button onClick={() => d.id && handleDelete(d.id)} className="text-red-500 text-sm">✕</button>
                  </div>
                </div>
              ))}
              
              {/* 固定金額後の残り表示 */}
              {totalFixed > 0 && (
                <div className="flex justify-between py-2 bg-gray-50 px-2 rounded text-sm">
                  <span className="text-gray-600">残り（%分配対象）</span>
                  <span className="font-medium text-blue-600">¥{profitAfterFixed.toLocaleString()}</span>
                </div>
              )}
              
              {/* パーセンテージ */}
              {dists.filter(d => d.distributionType === 'percentage').map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-900">{d.recipientName}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={d.value}
                      onChange={(e) => setDistributions(prev => prev.map(x => x.id === d.id ? { ...x, value: parseFloat(e.target.value) || 0 } : x))}
                      onBlur={(e) => handleValueChange(d, parseFloat(e.target.value) || 0)}
                      className="w-16 text-right border rounded px-2 py-1 text-sm text-gray-900 bg-white"
                    />
                    <span className="text-gray-500 text-sm w-6">%</span>
                    <span className="text-green-600 font-medium w-28 text-right">¥{calcAmount(d).toLocaleString()}</span>
                    <button onClick={() => d.id && handleDelete(d.id)} className="text-red-500 text-sm">✕</button>
                  </div>
                </div>
              ))}
              
              {/* 合計 */}
              <div className="flex justify-between pt-3 border-t mt-2">
                <span className="font-semibold text-gray-900">分配合計</span>
                <span className="font-bold text-blue-600">
                  ¥{dists.reduce((s, d) => s + calcAmount(d), 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
