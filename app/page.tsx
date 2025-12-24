'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getExpenses, getAllBusinesses, getAllRevenueDistributions, getAllPaymentSources, getAllProfits } from '@/lib/supabase-db';
import { Expense, Business } from '@/lib/types';
import { format } from 'date-fns';
import { Settings, ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Distribution {
  id?: string;
  businessName: string;
  recipientName: string;
  distributionType: 'percentage' | 'amount';
  value: number;
}

interface RecipientMonthlyAmount {
  recipientName: string;
  amounts: { 
    month: string; 
    amount: number;
    distributionAmount: number; // 分配金額
    expenseReimbursement: number; // 経費立て替え返金額
  }[];
}

interface BusinessRecipientData {
  businessName: string;
  recipients: RecipientMonthlyAmount[];
}

interface MonthlyData {
  month: string;
  revenue: number;
  expense: number;
  grossProfit: number;
  tax: number;
  netProfit: number;
  // 事業ごとの売上内訳
  businessRevenues: { name: string; color: string; amount: number }[];
}

export default function Home() {
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [businessData, setBusinessData] = useState<{ name: string; revenue: number; expense: number; profit: number; color?: string }[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, expense: 0, grossProfit: 0, tax: 0, netProfit: 0 });
  const [taxRate] = useState(20); // 税率20%
  const [loading, setLoading] = useState(true);
  const [recipientMonthlyAmounts, setRecipientMonthlyAmounts] = useState<RecipientMonthlyAmount[]>([]);
  const [selectedBusinessForTransfer, setSelectedBusinessForTransfer] = useState<string>(''); // 振り込み関連で選択中の事業
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessRecipientData, setBusinessRecipientData] = useState<BusinessRecipientData[]>([]);
  const [currentDate, setCurrentDate] = useState<string>('');

  // デフォルトカラーパレット（事業に色が設定されていない場合に使用）
  const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  useEffect(() => {
    loadData();
    // クライアントサイドでのみ日付を設定（Hydrationエラー回避）
    setCurrentDate(format(new Date(), 'yyyy/MM/dd'));
  }, []);

  const loadData = async () => {
    try {
      // 経費データ
      const expenses = await getExpenses();
      setRecentExpenses(expenses.slice(0, 5));
      
      // 事業データ
      const businessesData = await getAllBusinesses();
      setBusinesses(businessesData);
      
      // デフォルトで最初の事業を選択
      if (!selectedBusinessForTransfer && businessesData.length > 0) {
        setSelectedBusinessForTransfer(businessesData[0].name);
      }
      
      const businesses = businessesData;
      
      // 利益データ
      const allProfits = await getAllProfits();
      
      // 月別・事業別データを構築
      const monthMap: Record<string, { revenue: number; expense: number; businessRevenues: Record<string, number> }> = {};
      const bizMap: Record<string, { revenue: number; expense: number }> = {};
      
      // 登録されている事業名のリスト
      const validBusinessNames = new Set(businesses.map(b => b.name));
      
      // 月ごとにグループ化
      const monthGroups: Record<string, typeof allProfits> = {};
      allProfits.forEach(profit => {
        const month = profit.month;
        if (!month) return;
        if (!monthGroups[month]) monthGroups[month] = [];
        monthGroups[month].push(profit);
      });
      
      // 各月についてデータ集計
      Object.entries(monthGroups).forEach(([month, profits]) => {
        // 最新の1つだけを使用
        const latestProfit = profits[0]; // ソート済み前提
        const revenues = latestProfit.revenues || {};
        
        if (!monthMap[month]) monthMap[month] = { revenue: 0, expense: 0, businessRevenues: {} };
        
        Object.entries(revenues).forEach(([biz, rev]) => {
          // 登録されている事業のみカウント
          if (validBusinessNames.has(biz)) {
            const amount = rev as number;
            monthMap[month].revenue += amount;
            monthMap[month].businessRevenues[biz] = amount;
            
            if (!bizMap[biz]) bizMap[biz] = { revenue: 0, expense: 0 };
            bizMap[biz].revenue += amount;
          }
        });
      });
      
      // 経費を追加
      expenses.forEach((exp: any) => {
        const month = exp.month;
        const biz = exp.business;
        
        if (biz && validBusinessNames.has(biz)) {
          if (!monthMap[month]) monthMap[month] = { revenue: 0, expense: 0, businessRevenues: {} };
          monthMap[month].expense += exp.amount;
          
          if (!bizMap[biz]) bizMap[biz] = { revenue: 0, expense: 0 };
          bizMap[biz].expense += exp.amount;
        }
      });
      
      // 月別データ（最新6ヶ月）
      const sortedMonths = Object.keys(monthMap).sort().slice(-6);
      const monthly = sortedMonths.map(month => {
        const data = monthMap[month];
        const revenue = data.revenue;
        const expense = data.expense;
        const grossProfit = revenue - expense;
        const tax = grossProfit > 0 ? Math.floor(grossProfit * taxRate / 100) : 0;
        const netProfit = grossProfit - tax;
        
        // 事業別内訳を作成
        const businessRevenues = businesses.map((b, index) => ({
          name: b.name,
          color: b.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          amount: data.businessRevenues[b.name] || 0,
        })).filter(b => b.amount > 0).sort((a, b) => b.amount - a.amount);
        
        return { month, revenue, expense, grossProfit, tax, netProfit, businessRevenues };
      });
      setMonthlyData(monthly);
      
      // 事業別データ
      const bizData = businesses.map((b, index) => ({
        name: b.name,
        color: b.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
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
      
      // 分配データを取得して計算
      const distributionsData = await getAllRevenueDistributions();
      const distributions = distributionsData.map(dist => ({
        id: dist.id,
        businessName: dist.businessName,
        recipientName: dist.recipientName,
        distributionType: dist.distributionType,
        value: dist.value,
      })) as Distribution[];
      
      // 振り込み関連のデータ処理（前回と同じロジック）
      // ... (中略) ...
      // 前回のコードと同様のロジックを使用しますが、ここでは簡略化のために詳細な実装は省略し、
      // 既存のコードを維持しつつ、カラー対応部分のみを追加します。
      
      // --- 以下、既存の振り込み計算ロジックを再利用 ---
      const expenseByPayerMap: Record<string, Record<string, number>> = {};
      expenses.forEach((exp: any) => {
        const payer = exp.paymentSource;
        const month = exp.month;
        if (payer && month) {
          if (!expenseByPayerMap[payer]) expenseByPayerMap[payer] = {};
          if (!expenseByPayerMap[payer][month]) expenseByPayerMap[payer][month] = 0;
          expenseByPayerMap[payer][month] += exp.amount;
        }
      });
      
      const businessRecipientMap: Record<string, Record<string, Record<string, { distributionAmount: number; expenseReimbursement: number }>>> = {};
      
      businesses.forEach(business => {
        if (!businessRecipientMap[business.name]) businessRecipientMap[business.name] = {};
        const bizDistributions = distributions.filter(d => d.businessName === business.name);
        
        bizDistributions.forEach(dist => {
          if (!businessRecipientMap[business.name][dist.recipientName]) businessRecipientMap[business.name][dist.recipientName] = {};
          
          Object.keys(monthMap).forEach(month => {
            let bizRevenue = monthMap[month].businessRevenues[business.name] || 0;
            let bizExpense = 0;
            expenses.forEach((exp: any) => {
              if (exp.month === month && exp.business === business.name) bizExpense += exp.amount;
            });
            const bizProfit = bizRevenue - bizExpense;
            
            const totalFixed = bizDistributions.filter(d => d.distributionType === 'amount').reduce((s, d) => s + d.value, 0);
            const profitAfterFixed = bizProfit - totalFixed;
            
            let amount = 0;
            if (dist.distributionType === 'amount') amount = dist.value;
            else amount = Math.floor(profitAfterFixed * dist.value / 100);
            
            if (!businessRecipientMap[business.name][dist.recipientName][month]) {
              businessRecipientMap[business.name][dist.recipientName][month] = { distributionAmount: 0, expenseReimbursement: 0 };
            }
            businessRecipientMap[business.name][dist.recipientName][month].distributionAmount += amount;
          });
        });
        
        Object.keys(expenseByPayerMap).forEach(payerName => {
          Object.entries(expenseByPayerMap[payerName]).forEach(([month, amount]) => {
            const isBusinessExpense = expenses.some((exp: any) => 
              exp.month === month && exp.business === business.name && exp.paymentSource === payerName
            );
            if (isBusinessExpense) {
              if (!businessRecipientMap[business.name][payerName]) businessRecipientMap[business.name][payerName] = {};
              if (!businessRecipientMap[business.name][payerName][month]) {
                businessRecipientMap[business.name][payerName][month] = { distributionAmount: 0, expenseReimbursement: 0 };
              }
              businessRecipientMap[business.name][payerName][month].expenseReimbursement += amount;
            }
          });
        });
      });
      
      const businessRecipientDataArray: BusinessRecipientData[] = Object.entries(businessRecipientMap).map(([businessName, recipientMap]) => {
        const recipients: RecipientMonthlyAmount[] = Object.entries(recipientMap).map(([recipientName, monthMap]) => {
          const amounts = Object.entries(monthMap).map(([month, data]) => ({
            month,
            distributionAmount: data.distributionAmount,
            expenseReimbursement: data.expenseReimbursement,
            amount: data.distributionAmount + data.expenseReimbursement,
          })).sort((a, b) => a.month.localeCompare(b.month));
          return { recipientName, amounts };
        });
        return { businessName, recipients };
      });
      
      setBusinessRecipientData(businessRecipientDataArray);
      
      const selectedBusinessData = businessRecipientDataArray.find(b => b.businessName === selectedBusinessForTransfer);
      if (selectedBusinessData) {
        setRecipientMonthlyAmounts(selectedBusinessData.recipients);
      } else if (businessRecipientDataArray.length > 0) {
        setRecipientMonthlyAmounts(businessRecipientDataArray[0].recipients);
        if (!selectedBusinessForTransfer) setSelectedBusinessForTransfer(businessRecipientDataArray[0].businessName);
      } else {
        setRecipientMonthlyAmounts([]);
      }
      
    } catch (error) {
      console.error('データの読み込みに失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxMonthlyValue = Math.max(...monthlyData.map(d => Math.max(d.revenue, d.expense)), 1);
  const maxBizValue = Math.max(...businessData.map(d => d.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">最終更新: {currentDate || '-'}</span>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ... (前回と同じ) ... */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totals.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">過去6ヶ月の合計</p>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総経費</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">¥{totals.expense.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">過去6ヶ月の合計</p>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">粗利</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ¥{totals.grossProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">売上 - 経費</p>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">純利益 (税引後)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ¥{totals.netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">税率 {taxRate}% で計算</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* 月別グラフ (積み上げ) */}
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>月別推移 (事業別売上)</CardTitle>
            <CardDescription>事業ごとの売上構成と経費</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">読み込み中...</div>
            ) : monthlyData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">データがありません</div>
            ) : (
              <div className="space-y-6">
                {monthlyData.map((d) => (
                  <div key={d.month} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{d.month}</span>
                      <div className="flex gap-4 text-xs">
                        <span>売上: ¥{d.revenue.toLocaleString()}</span>
                        <span className="text-red-600">経費: ¥{d.expense.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {/* 売上 (積み上げバー) */}
                    <div className="h-3 rounded-full overflow-hidden bg-gray-100 flex">
                      {d.businessRevenues.map((biz, i) => (
                        <div 
                          key={biz.name}
                          className="h-full transition-all duration-500 relative group"
                          style={{ 
                            width: `${(biz.amount / maxMonthlyValue) * 50}%`,
                            backgroundColor: biz.color
                          }}
                          title={`${biz.name}: ¥${biz.amount.toLocaleString()}`}
                        />
                      ))}
                      
                      {/* 経費バー (右側から表示するためのスペース) */}
                      <div className="flex-1" />
                      
                      {/* 経費バー */}
                      <div 
                        className="bg-red-400 h-full transition-all duration-500"
                        style={{ width: `${(d.expense / maxMonthlyValue) * 50}%` }}
                        title={`経費: ¥${d.expense.toLocaleString()}`}
                      />
                    </div>
                    
                    {/* 凡例 (上位のみ) */}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
                      {d.businessRevenues.slice(0, 3).map(biz => (
                        <div key={biz.name} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: biz.color }} />
                          <span>{biz.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 事業別グラフ */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>事業別売上</CardTitle>
            <CardDescription>事業ごとの収益状況</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">読み込み中...</div>
            ) : businessData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">データがありません</div>
            ) : (
              <div className="space-y-6">
                {businessData.slice(0, 5).map((d) => (
                  <div key={d.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate max-w-[150px]" title={d.name}>{d.name}</span>
                      <span className="font-bold" style={{ color: d.color }}>¥{d.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(d.revenue / maxBizValue) * 100}%`,
                          backgroundColor: d.color
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>経費: ¥{d.expense.toLocaleString()}</span>
                      <span className={d.profit >= 0 ? 'text-blue-600' : 'text-red-600'}>
                        利益: ¥{d.profit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 振り込み関連 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>振り込み関連</CardTitle>
              <CardDescription>分配金と経費精算</CardDescription>
            </div>
            <Link href="/transfers" className="text-sm text-blue-600 hover:underline">
              詳細を確認 →
            </Link>
          </CardHeader>
          <CardContent>
            {businesses.length > 0 && (
              <div className="mb-6">
                <select
                  value={selectedBusinessForTransfer}
                  onChange={(e) => {
                    setSelectedBusinessForTransfer(e.target.value);
                    const selectedData = businessRecipientData.find(b => b.businessName === e.target.value);
                    if (selectedData) {
                      setRecipientMonthlyAmounts(selectedData.recipients);
                    } else {
                      setRecipientMonthlyAmounts([]);
                    }
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {businesses.map(business => (
                    <option key={business.id} value={business.name}>{business.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
            ) : recipientMonthlyAmounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">データがありません</div>
            ) : (
              <div className="space-y-6">
                {recipientMonthlyAmounts.map((recipient) => (
                  <div key={recipient.recipientName} className="rounded-lg border p-4">
                    <div className="font-semibold mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      {recipient.recipientName}
                    </div>
                    <div className="space-y-3">
                      {recipient.amounts.map((item) => {
                        const hasExpenseReimbursement = item.expenseReimbursement > 0;
                        const hasDistribution = item.distributionAmount > 0;
                        const showBreakdown = hasExpenseReimbursement && hasDistribution;
                        
                        return (
                          <div key={item.month} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground font-medium">{item.month}</span>
                              <span className="font-bold text-green-600">¥{item.amount.toLocaleString()}</span>
                            </div>
                            {showBreakdown && (
                              <div className="pl-3 border-l-2 border-gray-100 space-y-1 mt-1">
                                {hasDistribution && (
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>分配金</span>
                                    <span>¥{item.distributionAmount.toLocaleString()}</span>
                                  </div>
                                )}
                                {hasExpenseReimbursement && (
                                  <div className="flex justify-between text-xs text-orange-600">
                                    <span>経費立替</span>
                                    <span>¥{item.expenseReimbursement.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="flex justify-between pt-3 border-t mt-2">
                        <span className="font-semibold text-sm">合計</span>
                        <span className="font-bold text-green-600">
                          ¥{recipient.amounts.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近の経費 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>最近の経費</CardTitle>
              <CardDescription>最新の5件を表示</CardDescription>
            </div>
            <Link href="/expenses" className="text-sm text-blue-600 hover:underline">
              すべて見る →
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
            ) : recentExpenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">経費データがありません</div>
            ) : (
              <div className="space-y-0">
                {recentExpenses.map((expense) => {
                  // 事業の色を取得
                  const business = businesses.find(b => b.name === expense.business);
                  const color = business?.color || '#d1d5db';
                  
                  return (
                    <div key={expense.id} className="flex justify-between items-center py-3 border-b last:border-0 hover:bg-gray-50/50 -mx-4 px-4 transition-colors">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{expense.description || expense.category}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{expense.date instanceof Date ? format(expense.date, 'yyyy/MM/dd') : expense.date}</span>
                          {expense.business && (
                            <>
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                              <span>{expense.business}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="font-medium text-red-600 text-sm">
                        −¥{expense.amount.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
