'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getExpenses, getAllBusinesses } from '@/lib/firestore';
import { Expense, Business } from '@/lib/types';
import { format } from 'date-fns';
import { Settings } from 'lucide-react';

interface MonthlyData {
  month: string;
  revenue: number;
  expense: number;
  grossProfit: number;
  tax: number;
  netProfit: number;
}

export default function Home() {
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [businessData, setBusinessData] = useState<{ name: string; revenue: number; expense: number; profit: number }[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, expense: 0, grossProfit: 0, tax: 0, netProfit: 0 });
  const [taxRate] = useState(20); // 税率20%
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!db) {
        console.error('Firebase DBが初期化されていません');
        setLoading(false);
        return;
      }
      
      // 経費データ
      const expenses = await getExpenses();
      setRecentExpenses(expenses.slice(0, 5));
      
      // 事業データ
      const businesses = await getAllBusinesses();
      
      // 利益データ
      const profitSnapshot = await getDocs(query(collection(db!, 'profits')));
      
      // 月別・事業別データを構築
      const monthMap: Record<string, { revenue: number; expense: number }> = {};
      const bizMap: Record<string, { revenue: number; expense: number }> = {};
      
      // 登録されている事業名のリスト
      const validBusinessNames = new Set(businesses.map(b => b.name));
      
      // 利益データから売上を取得（登録されている事業のみ）
      profitSnapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        const month = d.month;
        const revenues = d.revenues || {};
        
        if (!monthMap[month]) monthMap[month] = { revenue: 0, expense: 0 };
        
        Object.entries(revenues).forEach(([biz, rev]) => {
          // 登録されている事業のみカウント
          if (validBusinessNames.has(biz)) {
            monthMap[month].revenue += rev as number;
            if (!bizMap[biz]) bizMap[biz] = { revenue: 0, expense: 0 };
            bizMap[biz].revenue += rev as number;
          }
        });
      });
      
      // 経費を追加（登録されている事業のみ）
      expenses.forEach((exp: any) => {
        const month = exp.month;
        const biz = exp.business;
        
        // 登録されている事業のみカウント
        if (biz && validBusinessNames.has(biz)) {
          if (!monthMap[month]) monthMap[month] = { revenue: 0, expense: 0 };
          monthMap[month].expense += exp.amount;
          
          if (!bizMap[biz]) bizMap[biz] = { revenue: 0, expense: 0 };
          bizMap[biz].expense += exp.amount;
        }
      });
      
      // 月別データ（最新6ヶ月）
      const sortedMonths = Object.keys(monthMap).sort().slice(-6);
      const monthly = sortedMonths.map(month => {
        const revenue = monthMap[month].revenue;
        const expense = monthMap[month].expense;
        const grossProfit = revenue - expense;
        const tax = grossProfit > 0 ? Math.floor(grossProfit * taxRate / 100) : 0;
        const netProfit = grossProfit - tax;
        return { month, revenue, expense, grossProfit, tax, netProfit };
      });
      setMonthlyData(monthly);
      
      // 事業別データ（登録されている事業のみ）
      const bizData = businesses.map(b => ({
        name: b.name,
        revenue: bizMap[b.name]?.revenue || 0,
        expense: bizMap[b.name]?.expense || 0,
        profit: (bizMap[b.name]?.revenue || 0) - (bizMap[b.name]?.expense || 0),
      })).filter(d => d.revenue > 0 || d.expense > 0).sort((a, b) => b.revenue - a.revenue);
      setBusinessData(bizData);
      
      // 合計
      const totalRevenue = Object.values(monthMap).reduce((s, d) => s + d.revenue, 0);
      const totalExpense = Object.values(monthMap).reduce((s, d) => s + d.expense, 0);
      const grossProfit = totalRevenue - totalExpense;
      const tax = grossProfit > 0 ? Math.floor(grossProfit * taxRate / 100) : 0;
      const netProfit = grossProfit - tax;
      setTotals({
        revenue: totalRevenue,
        expense: totalExpense,
        grossProfit,
        tax,
        netProfit,
      });
      
    } catch (error) {
      console.error('データの読み込みに失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // グラフの最大値を計算
  const maxMonthlyValue = Math.max(...monthlyData.map(d => Math.max(d.revenue, d.expense)), 1);
  const maxBizValue = Math.max(...businessData.map(d => d.revenue), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">売り上げ管理</h1>
          <Link 
            href="/settings"
            className="text-gray-600 hover:text-gray-900 transition"
            title="設定"
          >
            <Settings className="w-6 h-6" />
          </Link>
        </div>
        
        {/* メニュー */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link 
            href="/expenses"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-900">経費管理</h2>
            <p className="text-gray-600">経費の登録・管理・CSV取り込み</p>
          </Link>
          
          <Link 
            href="/profits"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-900">利益管理</h2>
            <p className="text-gray-600">月次売上・経費・利益の確認</p>
          </Link>
          
          <Link 
            href="/assets"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-900">資産管理</h2>
            <p className="text-gray-600">資産の登録・管理</p>
          </Link>
          
          <Link 
            href="/distributions"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-900">収益分配</h2>
            <p className="text-gray-600">事業ごとの分配設定</p>
          </Link>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-xs text-gray-500 mb-1">総売上</div>
            <div className="text-xl font-bold text-gray-900">¥{totals.revenue.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-xs text-gray-500 mb-1">総経費</div>
            <div className="text-xl font-bold text-red-600">¥{totals.expense.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-xs text-gray-500 mb-1">粗利</div>
            <div className={`text-xl font-bold ${totals.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ¥{totals.grossProfit.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-xs text-gray-500 mb-1">税金 ({taxRate}%)</div>
            <div className="text-xl font-bold text-orange-600">¥{totals.tax.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow col-span-2 md:col-span-1">
            <div className="text-xs text-gray-500 mb-1">純利益</div>
            <div className={`text-xl font-bold ${totals.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ¥{totals.netProfit.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 月別グラフ */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">月別推移</h2>
            {loading ? (
              <p className="text-gray-500">読み込み中...</p>
            ) : monthlyData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">データがありません</p>
            ) : (
              <div className="space-y-4">
                {monthlyData.map((d) => (
                  <div key={d.month} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium">{d.month}</span>
                      <div className="flex gap-3 text-xs">
                        <span className="text-blue-600">粗利: ¥{d.grossProfit.toLocaleString()}</span>
                        <span className={`font-medium ${d.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          純利益: ¥{d.netProfit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-6">
                      <div 
                        className="bg-green-500 rounded-l"
                        style={{ width: `${(d.revenue / maxMonthlyValue) * 50}%` }}
                        title={`売上: ¥${d.revenue.toLocaleString()}`}
                      />
                      <div 
                        className="bg-red-400 rounded-r"
                        style={{ width: `${(d.expense / maxMonthlyValue) * 50}%` }}
                        title={`経費: ¥${d.expense.toLocaleString()}`}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>売上: ¥{d.revenue.toLocaleString()}</span>
                      <span>経費: ¥{d.expense.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                <div className="flex gap-4 text-xs mt-4 pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span className="text-gray-600">売上</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-400 rounded" />
                    <span className="text-gray-600">経費</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 事業別グラフ */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">事業別売上</h2>
            {loading ? (
              <p className="text-gray-500">読み込み中...</p>
            ) : businessData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">データがありません</p>
            ) : (
              <div className="space-y-4">
                {businessData.slice(0, 5).map((d) => (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium">{d.name}</span>
                      <span className="text-green-600">¥{d.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-4 bg-gray-100 rounded overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded"
                        style={{ width: `${(d.revenue / maxBizValue) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>経費: ¥{d.expense.toLocaleString()}</span>
                      <span className={d.profit >= 0 ? 'text-blue-600' : 'text-red-600'}>
                        利益: ¥{d.profit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 最近の経費 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最近の経費</h2>
            <Link href="/expenses" className="text-blue-600 hover:underline text-sm">すべて見る →</Link>
          </div>
          {loading ? (
            <p className="text-gray-500">読み込み中...</p>
          ) : recentExpenses.length === 0 ? (
            <p className="text-gray-500">経費データがありません</p>
          ) : (
            <div className="space-y-2">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <div className="text-gray-900">{expense.description || expense.category}</div>
                    <div className="text-xs text-gray-500">
                      {expense.date instanceof Date ? format(expense.date, 'yyyy/MM/dd') : expense.date}
                      {expense.business && ` • ${expense.business}`}
                    </div>
                  </div>
                  <div className="text-red-600 font-medium">
                    −¥{expense.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
