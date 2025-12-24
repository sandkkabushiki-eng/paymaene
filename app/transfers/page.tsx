'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getAllBusinesses, getExpenses, getAllRevenueDistributions, getAllProfits, getAllTransferStatuses, upsertTransferStatus, getAllCategories } from '@/lib/supabase-db';
import { Business, TransferStatus, Expense, RevenueDistribution, Category } from '@/lib/types';
import { format } from 'date-fns';
import { Banknote, Filter, Download, Wallet, Check, Clock, ChevronDown, Building2, Receipt, ChevronRight, LayoutList, AlignJustify, Folder } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

interface ExpenseDetail {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Date | string;
}

interface RecipientData {
  recipientName: string;
  distributionAmount: number;
  distributionType: 'percentage' | 'amount';
  distributionValue: number; // パーセントまたは固定金額
  expenseReimbursement: number;
  expenseDetails: ExpenseDetail[];
  totalAmount: number;
}

interface BusinessMonthData {
  businessName: string;
  businessCategory?: string;
  businessColor?: string;
  recipients: RecipientData[];
  totalDistribution: number;
  totalExpense: number;
  totalAmount: number;
}

interface SimpleRecipientData {
  recipientName: string;
  distributionAmount: number;
  expenseReimbursement: number;
  totalAmount: number;
  relatedBusinesses: string[]; // 関連する事業名のリスト
  expenseDetails: ExpenseDetail[];
}

interface MonthData {
  month: string;
  businesses: BusinessMonthData[];
  simpleRecipients: SimpleRecipientData[]; // シンプルモード用データ
  grandTotal: number;
}

export default function TransfersPage() {
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [transferStatuses, setTransferStatuses] = useState<TransferStatus[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'detailed' | 'simple'>('detailed');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  // ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [businessesData, categoriesData] = await Promise.all([
        getAllBusinesses(),
        getAllCategories().catch(() => []) // エラー時は空配列
      ]);
      setBusinesses(businessesData);
      setCategories(categoriesData);
      
      // 振り込みステータスを取得（テーブルが存在しない場合は空配列）
      try {
        const statuses = await getAllTransferStatuses();
        setTransferStatuses(statuses);
      } catch (statusError) {
        console.warn('振り込みステータステーブルが見つかりません。SQLを実行してテーブルを作成してください。');
        setTransferStatuses([]);
      }
      
      const expenses = await getExpenses();
      const allProfits = await getAllProfits();
      const distributionsData = await getAllRevenueDistributions();
      
      // 月のリストを取得
      const months = Array.from(new Set(allProfits.map(p => p.month))).sort().reverse();
      
      // 月ごとのデータを構築
      const monthlyDataArray: MonthData[] = months.map(month => {
        const profit = allProfits.find(p => p.month === month);
        const revenues = profit?.revenues || {};
        
        // 詳細モード用データ構築
        const businessDataArray: BusinessMonthData[] = businessesData.map(business => {
          const bizRevenue = revenues[business.name] || 0;
          
          // この事業・月の経費
          const bizExpenses = expenses.filter(
            (exp: any) => exp.month === month && exp.business === business.name
          );
          const bizExpenseTotal = bizExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
          
          // この事業の利益
          const bizProfit = bizRevenue - bizExpenseTotal;
          
          // この事業の分配設定
          const bizDistributions = distributionsData.filter(d => d.businessName === business.name);
          
          // 固定金額合計
          const totalFixed = bizDistributions
            .filter(d => d.distributionType === 'amount')
            .reduce((s, d) => s + d.value, 0);
          
          const profitAfterFixed = bizProfit - totalFixed;
          
          // 分配先ごとのデータを構築
          const recipientMap: Record<string, RecipientData> = {};
          
          // 分配金を計算
          bizDistributions.forEach(dist => {
            let distributionAmount = 0;
            if (dist.distributionType === 'amount') {
              distributionAmount = dist.value;
            } else {
              distributionAmount = Math.floor(profitAfterFixed * dist.value / 100);
            }
            
            if (!recipientMap[dist.recipientName]) {
              recipientMap[dist.recipientName] = {
                recipientName: dist.recipientName,
                distributionAmount: 0,
                distributionType: dist.distributionType,
                distributionValue: dist.value,
                expenseReimbursement: 0,
                expenseDetails: [],
                totalAmount: 0,
              };
            }
            
            recipientMap[dist.recipientName].distributionAmount += distributionAmount;
            recipientMap[dist.recipientName].distributionType = dist.distributionType;
            recipientMap[dist.recipientName].distributionValue = dist.value;
          });
          
          // 経費立て替えを追加
          bizExpenses.forEach((exp: any) => {
            const payer = exp.paymentSource;
            if (!payer) return;
            
            if (!recipientMap[payer]) {
              recipientMap[payer] = {
                recipientName: payer,
                distributionAmount: 0,
                distributionType: 'amount',
                distributionValue: 0,
                expenseReimbursement: 0,
                expenseDetails: [],
                totalAmount: 0,
              };
            }
            
            recipientMap[payer].expenseReimbursement += exp.amount;
            recipientMap[payer].expenseDetails.push({
              id: exp.id,
              category: exp.category || '未分類',
              description: exp.description || '',
              amount: exp.amount,
              date: exp.date,
            });
          });
          
          // 合計を計算
          const recipients = Object.values(recipientMap).map(r => ({
            ...r,
            totalAmount: r.distributionAmount + r.expenseReimbursement,
          })).filter(r => r.totalAmount !== 0);
          
          const totalDistribution = recipients.reduce((sum, r) => sum + r.distributionAmount, 0);
          const totalExpense = recipients.reduce((sum, r) => sum + r.expenseReimbursement, 0);
          const totalAmount = totalDistribution + totalExpense;
          
          // カテゴリ名を取得（カテゴリマスターから）
          const categoryName = business.categoryId 
            ? (categories.find(c => c.id === business.categoryId)?.name || business.category || 'その他')
            : (business.category || 'その他');
          
          return {
            businessName: business.name,
            businessCategory: categoryName,
            businessColor: business.color || categories.find(c => c.id === business.categoryId)?.color,
            recipients,
            totalDistribution,
            totalExpense,
            totalAmount,
          };
        }).filter(b => b.totalAmount !== 0);

        // シンプルモード用データ構築（受取人ごとに集約）
        const simpleRecipientMap: Record<string, SimpleRecipientData> = {};
        
        businessDataArray.forEach(biz => {
          biz.recipients.forEach(r => {
            if (!simpleRecipientMap[r.recipientName]) {
              simpleRecipientMap[r.recipientName] = {
                recipientName: r.recipientName,
                distributionAmount: 0,
                expenseReimbursement: 0,
                totalAmount: 0,
                relatedBusinesses: [],
                expenseDetails: [],
              };
            }
            
            simpleRecipientMap[r.recipientName].distributionAmount += r.distributionAmount;
            simpleRecipientMap[r.recipientName].expenseReimbursement += r.expenseReimbursement;
            simpleRecipientMap[r.recipientName].totalAmount += r.totalAmount;
            simpleRecipientMap[r.recipientName].expenseDetails.push(...r.expenseDetails);
            
            if (!simpleRecipientMap[r.recipientName].relatedBusinesses.includes(biz.businessName)) {
              simpleRecipientMap[r.recipientName].relatedBusinesses.push(biz.businessName);
            }
          });
        });

        const simpleRecipients = Object.values(simpleRecipientMap).sort((a, b) => b.totalAmount - a.totalAmount);
        
        const grandTotal = businessDataArray.reduce((sum, b) => sum + b.totalAmount, 0);
        
        return {
          month,
          businesses: businessDataArray,
          simpleRecipients,
          grandTotal,
        };
      }).filter(m => m.grandTotal !== 0);
      
      setMonthlyData(monthlyDataArray);
      
    } catch (error: any) {
      console.error('データの読み込みに失敗:', error?.message || error?.code || JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  // ステータスを取得する関数
  const getStatus = (month: string, recipientName: string, businessName: string): 'unpaid' | 'paid' => {
    // シンプルモードの場合（businessNameが空文字）は、その受取人の全事業のステータスを確認
    if (businessName === '') {
      // その月のその受取人に関連する全事業を取得
      const monthData = monthlyData.find(m => m.month === month);
      const recipientData = monthData?.simpleRecipients.find(r => r.recipientName === recipientName);
      
      if (!recipientData || recipientData.relatedBusinesses.length === 0) return 'unpaid';

      // 関連する全事業のステータスを確認
      const allStatuses = recipientData.relatedBusinesses.map(biz => {
        const status = transferStatuses.find(
          s => s.month === month && s.recipientName === recipientName && s.businessName === biz
        );
        return status?.status || 'unpaid';
      });

      // 全てpaidならpaid、一つでもunpaidならunpaid
      return allStatuses.every(s => s === 'paid') ? 'paid' : 'unpaid';
    }

    // 詳細モードの場合は個別のステータスを返す
    const status = transferStatuses.find(
      s => s.month === month && s.recipientName === recipientName && s.businessName === businessName
    );
    return status?.status || 'unpaid';
  };

  // ローカルステートを更新するヘルパー関数
  const updateLocalStatus = (month: string, recipientName: string, businessName: string, newStatus: 'unpaid' | 'paid') => {
    setTransferStatuses(prev => {
      // シンプルモードの場合、関連する全事業のステータスを更新
      if (businessName === '') {
        const monthData = monthlyData.find(m => m.month === month);
        const recipientData = monthData?.simpleRecipients.find(r => r.recipientName === recipientName);
        
        if (!recipientData) return prev;

        let updated = [...prev];
        
        recipientData.relatedBusinesses.forEach(biz => {
          const existingIndex = updated.findIndex(
            s => s.month === month && s.recipientName === recipientName && s.businessName === biz
          );

          if (existingIndex >= 0) {
            updated[existingIndex] = {
              ...updated[existingIndex],
              status: newStatus,
              paidAt: newStatus === 'paid' ? new Date() : null,
            };
          } else {
            updated.push({
              month,
              recipientName,
              businessName: biz,
              status: newStatus,
              paidAt: newStatus === 'paid' ? new Date() : null,
              memo: '',
            });
          }
        });
        return updated;
      }

      // 詳細モードの場合
      const existingIndex = prev.findIndex(
        s => s.month === month && s.recipientName === recipientName && s.businessName === businessName
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date() : null,
        };
        return updated;
      } else {
        return [...prev, {
          month,
          recipientName,
          businessName,
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date() : null,
          memo: '',
        }];
      }
    });
    setOpenDropdown(null);
  };

  // ステータスを更新する関数
  const handleStatusChange = async (month: string, recipientName: string, businessName: string, newStatus: 'unpaid' | 'paid') => {
    // まずローカルで即座に更新（楽観的更新）
    updateLocalStatus(month, recipientName, businessName, newStatus);
    
    // DBへの保存を試みる
    try {
      if (businessName === '') {
        // シンプルモードの場合、関連する全事業のステータスを一括更新
        const monthData = monthlyData.find(m => m.month === month);
        const recipientData = monthData?.simpleRecipients.find(r => r.recipientName === recipientName);
        
        if (recipientData) {
          await Promise.all(recipientData.relatedBusinesses.map(biz => 
            upsertTransferStatus({
              month,
              recipientName,
              businessName: biz,
              status: newStatus,
              paidAt: newStatus === 'paid' ? new Date() : null,
              memo: '',
            })
          ));
        }
      } else {
        // 詳細モードの場合
        await upsertTransferStatus({
          month,
          recipientName,
          businessName,
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date() : null,
          memo: '',
        });
      }
    } catch (error: any) {
      // DBへの保存が失敗してもローカルでは更新済み
      console.warn('ステータスをDBに保存できませんでした:', error?.message || error?.code || 'Unknown error');
    }
  };

  // 経費詳細の展開/折りたたみ
  const toggleExpenseDetails = (key: string) => {
    setExpandedExpenses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // 表示する月のリスト
  const allMonths = monthlyData.map(m => m.month);
  
  // フィルタリングされたデータ
  const filteredData = selectedMonth 
    ? monthlyData.filter(m => m.month === selectedMonth)
    : monthlyData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">振り込み管理</h1>
          <p className="text-muted-foreground mt-1">
            月ごとの分配金と経費精算額を確認します
          </p>
        </div>
        
        {/* モード切り替えタブ */}
        <div className="bg-muted p-1 rounded-lg flex items-center shadow-sm border border-border/50">
          <button
            onClick={() => setViewMode('detailed')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              viewMode === 'detailed' 
                ? "bg-white text-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )}
          >
            <AlignJustify className="w-4 h-4" />
            詳細（事業別）
          </button>
          <button
            onClick={() => setViewMode('simple')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              viewMode === 'simple' 
                ? "bg-white text-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )}
          >
            <LayoutList className="w-4 h-4" />
            シンプル（人別）
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">月で絞り込み</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-sm"
          >
            <option value="">すべての期間</option>
            {allMonths.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">データがありません</div>
      ) : (
        <div className="space-y-8">
          {filteredData.map(monthData => (
            <div key={monthData.month} className="space-y-4">
              {/* 月のヘッダー */}
              <div className="flex items-center justify-between bg-white border border-border/50 px-6 py-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 w-1.5 h-8 rounded-full"></div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{monthData.month}</h2>
                </div>
                <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-lg">
                  <Wallet className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">月間合計支払額:</span>
                  <span className={cn(
                    "text-xl font-bold tracking-tight",
                    monthData.grandTotal < 0 ? "text-red-600" : "text-foreground"
                  )}>
                    ¥{monthData.grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
              
              {/* 表示モードに応じたレンダリング */}
              {viewMode === 'detailed' ? (
                /* 詳細モード（カテゴリ別 → 事業別） */
                <div className="space-y-6">
                  {(() => {
                    // カテゴリマスターからカテゴリ情報を取得
                    const categoryMap = new Map<string, { name: string; color?: string; displayOrder: number; businesses: typeof monthData.businesses }>();
                    
                    // カテゴリマスターからグループを作成
                    categories.forEach(cat => {
                      categoryMap.set(cat.id!, { 
                        name: cat.name, 
                        color: cat.color, 
                        displayOrder: cat.displayOrder || 0,
                        businesses: [] 
                      });
                    });
                    
                    // カテゴリなしの事業用
                    const uncategorized: typeof monthData.businesses = [];
                    
                    // 事業をカテゴリごとに分類
                    monthData.businesses.forEach(biz => {
                      // businessCategoryIdを事業マスターから取得
                      const bizCategoryId = businesses.find(b => b.name === biz.businessName)?.categoryId;
                      
                      if (bizCategoryId && categoryMap.has(bizCategoryId)) {
                        categoryMap.get(bizCategoryId)!.businesses.push(biz);
                      } else if (biz.businessCategory && biz.businessCategory !== 'その他') {
                        // カテゴリ名でグループ化（後方互換性）
                        const key = `name:${biz.businessCategory}`;
                        if (!categoryMap.has(key)) {
                          categoryMap.set(key, { 
                            name: biz.businessCategory, 
                            color: undefined, 
                            displayOrder: 999,
                            businesses: [] 
                          });
                        }
                        categoryMap.get(key)!.businesses.push(biz);
                      } else {
                        uncategorized.push(biz);
                      }
                    });
                    
                    // カテゴリなしがある場合は追加
                    if (uncategorized.length > 0) {
                      categoryMap.set('uncategorized', { 
                        name: 'その他', 
                        color: undefined, 
                        displayOrder: 999,
                        businesses: uncategorized 
                      });
                    }
                    
                    // カテゴリを表示順序でソート
                    const sortedCats = Array.from(categoryMap.entries()).sort((a, b) => {
                      return a[1].displayOrder - b[1].displayOrder;
                    });
                    
                    return sortedCats.map(([key, group]) => {
                      if (group.businesses.length === 0) return null;
                      
                      // カテゴリ合計
                      const categoryTotal = group.businesses.reduce((sum, b) => sum + b.totalAmount, 0);
                      
                      return (
                        <div key={key} className="space-y-4">
                          {/* カテゴリヘッダー */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-muted/80 to-muted/40 rounded-lg px-4 py-3">
                            <div className="flex items-center gap-3">
                              {group.color ? (
                                <div 
                                  className="w-5 h-5 rounded-lg"
                                  style={{ backgroundColor: group.color }}
                                />
                              ) : (
                                <Folder className="w-5 h-5 text-blue-600" />
                              )}
                              <span className="font-bold text-lg">{group.name}</span>
                              <span className="text-sm text-muted-foreground">({group.businesses.length}事業)</span>
                            </div>
                            <div className={cn(
                              "px-4 py-2 rounded-lg font-bold shadow-sm",
                              categoryTotal < 0 ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                            )}>
                              カテゴリ合計: ¥{categoryTotal.toLocaleString()}
                            </div>
                          </div>
                          
                          {/* カテゴリ内の事業一覧 */}
                          <div className="grid gap-4 ml-4 pl-4 border-l-2 border-muted">
                            {group.businesses.map(business => (
                    <Card key={business.businessName} className="overflow-hidden shadow-md border-border/60 transition-shadow hover:shadow-lg">
                      <CardHeader 
                        className="py-4 border-b"
                        style={{ 
                          background: `linear-gradient(135deg, ${business.businessColor || '#3b82f6'}15, ${business.businessColor || '#3b82f6'}05)`,
                          borderLeft: `4px solid ${business.businessColor || '#3b82f6'}`
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div 
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: `${business.businessColor || '#3b82f6'}20` }}
                            >
                              <Building2 
                                className="w-5 h-5" 
                                style={{ color: business.businessColor || '#3b82f6' }}
                              />
                            </div>
                            <CardTitle className="text-lg font-bold">{business.businessName}</CardTitle>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-muted-foreground flex flex-col items-end">
                              <span className="text-xs">分配金</span>
                              <span className={cn("font-bold text-base", business.totalDistribution < 0 ? "text-red-600" : "text-foreground")}>
                                ¥{business.totalDistribution.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-muted-foreground flex flex-col items-end">
                              <span className="text-xs">経費立替</span>
                              <span className={cn("font-bold text-base", business.totalExpense < 0 ? "text-red-600" : "text-orange-600")}>
                                ¥{business.totalExpense.toLocaleString()}
                              </span>
                            </div>
                            <div className={cn(
                              "px-4 py-2 rounded-lg font-bold shadow-sm",
                              business.totalAmount < 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                            )}>
                              合計: ¥{business.totalAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead className="w-[200px] py-3 pl-6">支払先</TableHead>
                              <TableHead className="text-right w-[180px]">分配金</TableHead>
                              <TableHead className="text-right w-[220px]">経費立替</TableHead>
                              <TableHead className="text-right w-[160px] font-bold">合計支払額</TableHead>
                              <TableHead className="text-center w-[140px] pr-6">ステータス</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {business.recipients.map(recipient => {
                              const expenseKey = `${monthData.month}-${business.businessName}-${recipient.recipientName}`;
                              const isExpenseExpanded = expandedExpenses.has(expenseKey);
                              
                              return (
                                <React.Fragment key={recipient.recipientName}>
                                  <TableRow className="hover:bg-muted/5 group">
                                    <TableCell className="font-medium pl-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div 
                                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                                          style={{ backgroundColor: business.businessColor || '#3b82f6' }}
                                        >
                                          {recipient.recipientName.slice(0, 1)}
                                        </div>
                                        <span className="text-base">{recipient.recipientName}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {recipient.distributionAmount !== 0 ? (
                                        <div className="flex flex-col items-end gap-1">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                            {recipient.distributionType === 'percentage' 
                                              ? `${recipient.distributionValue}%` 
                                              : `固定 ¥${recipient.distributionValue.toLocaleString()}`
                                            }
                                          </span>
                                          <div className={cn("font-bold text-base", recipient.distributionAmount < 0 ? "text-red-600" : "")}>
                                            ¥{recipient.distributionAmount.toLocaleString()}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground/50">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {recipient.expenseReimbursement !== 0 ? (
                                        <div className="flex flex-col items-end gap-1">
                                          <button
                                            onClick={() => toggleExpenseDetails(expenseKey)}
                                            className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 transition-colors group/btn"
                                          >
                                            <Receipt className="w-4 h-4" />
                                            <span className={cn("font-bold text-base", recipient.expenseReimbursement < 0 ? "text-red-600" : "")}>
                                              ¥{recipient.expenseReimbursement.toLocaleString()}
                                            </span>
                                            <ChevronRight 
                                              className={cn(
                                                "w-4 h-4 transition-transform opacity-50 group-hover/btn:opacity-100",
                                                isExpenseExpanded && "rotate-90"
                                              )} 
                                            />
                                          </button>
                                          <div className="text-xs text-muted-foreground">
                                            {recipient.expenseDetails.length}件の経費
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground/50">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className={cn(
                                      "text-right font-bold text-lg",
                                      recipient.totalAmount < 0 ? "text-red-600" : "text-green-600"
                                    )}>
                                      ¥{recipient.totalAmount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-center pr-6">
                                      {(() => {
                                        const dropdownKey = `${monthData.month}-${business.businessName}-${recipient.recipientName}`;
                                        const currentStatus = getStatus(monthData.month, recipient.recipientName, business.businessName);
                                        const isOpen = openDropdown === dropdownKey;
                                        
                                        return (
                                          <div className="relative inline-block" ref={isOpen ? dropdownRef : null}>
                                            <button
                                              onClick={() => setOpenDropdown(isOpen ? null : dropdownKey)}
                                              className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer hover:opacity-80 shadow-sm border",
                                                currentStatus === 'paid' 
                                                  ? "bg-green-100 text-green-800 hover:bg-green-200 border-green-200" 
                                                  : "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200"
                                              )}
                                            >
                                              {currentStatus === 'paid' ? (
                                                <>
                                                  <Check className="w-3.5 h-3.5" />
                                                  振込済
                                                </>
                                              ) : (
                                                <>
                                                  <Clock className="w-3.5 h-3.5" />
                                                  未払
                                                </>
                                              )}
                                              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform opacity-50", isOpen && "rotate-180")} />
                                            </button>
                                            
                                            {isOpen && (
                                              <div className="absolute z-50 mt-1 right-0 bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100">
                                                <button
                                                  onClick={() => handleStatusChange(monthData.month, recipient.recipientName, business.businessName, 'unpaid')}
                                                  className={cn(
                                                    "w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors",
                                                    currentStatus === 'unpaid' && "bg-gray-50 font-medium text-gray-900"
                                                  )}
                                                >
                                                  <Clock className="w-4 h-4 text-gray-400" />
                                                  <span>未払</span>
                                                  {currentStatus === 'unpaid' && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                                                </button>
                                                <button
                                                  onClick={() => handleStatusChange(monthData.month, recipient.recipientName, business.businessName, 'paid')}
                                                  className={cn(
                                                    "w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors",
                                                    currentStatus === 'paid' && "bg-gray-50 font-medium text-gray-900"
                                                  )}
                                                >
                                                  <Check className="w-4 h-4 text-green-500" />
                                                  <span>振込済</span>
                                                  {currentStatus === 'paid' && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </TableCell>
                                  </TableRow>
                                  
                                  {/* 経費詳細の展開行 */}
                                  {isExpenseExpanded && recipient.expenseDetails.length > 0 && (
                                    <TableRow className="bg-orange-50/30">
                                      <TableCell colSpan={5} className="py-4 pl-0 pr-0">
                                        <div className="pl-20 pr-6 relative">
                                          <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-orange-200/50"></div>
                                          <div className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                                            <div className="p-1 bg-orange-100 rounded">
                                              <Receipt className="w-4 h-4" />
                                            </div>
                                            経費詳細
                                          </div>
                                          <div className="grid gap-2">
                                            {recipient.expenseDetails.map((expense, idx) => (
                                              <div 
                                                key={expense.id || idx}
                                                className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-orange-100 shadow-sm"
                                              >
                                                <div className="flex items-center gap-4">
                                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-800">
                                                    {expense.category}
                                                  </span>
                                                  <div className="flex flex-col">
                                                    <span className="text-sm font-medium">
                                                      {expense.description || '(詳細なし)'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground mt-0.5">
                                                      {typeof expense.date === 'string' 
                                                        ? expense.date 
                                                        : format(expense.date, 'yyyy/MM/dd')
                                                      }
                                                    </span>
                                                  </div>
                                                </div>
                                                <span className={cn(
                                                  "font-bold text-base",
                                                  expense.amount < 0 ? "text-red-600" : "text-orange-600"
                                                )}>
                                                  ¥{expense.amount.toLocaleString()}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                            ))}
                          </div>
                        </div>
                      );
                    }).filter(Boolean);
                  })()}
                </div>
              ) : (
                /* シンプルモード（人別） */
                <Card className="overflow-hidden shadow-md border-border/60">
                  <CardHeader className="bg-muted/10 py-5 border-b">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <LayoutList className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-xl">支払先別サマリー</CardTitle>
                    </div>
                    <CardDescription className="text-sm ml-12">
                      この月の合計支払額を確認できます。ここでステータスを変更すると、関連する全事業のステータスが更新されます。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="w-[250px] py-3 pl-6">支払先</TableHead>
                          <TableHead className="text-right w-[180px]">分配金合計</TableHead>
                          <TableHead className="text-right w-[220px]">経費立替合計</TableHead>
                          <TableHead className="text-right w-[160px] font-bold">合計支払額</TableHead>
                          <TableHead className="text-center w-[140px] pr-6">ステータス</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthData.simpleRecipients.map(recipient => {
                          const expenseKey = `${monthData.month}-simple-${recipient.recipientName}`;
                          const isExpenseExpanded = expandedExpenses.has(expenseKey);

                          return (
                            <React.Fragment key={recipient.recipientName}>
                              <TableRow className="hover:bg-muted/5 group">
                                <TableCell className="font-medium pl-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shadow-sm">
                                      {recipient.recipientName.slice(0, 1)}
                                    </div>
                                    <div>
                                      <div className="text-base font-bold">{recipient.recipientName}</div>
                                      <div className="text-xs text-muted-foreground mt-1 flex gap-1 flex-wrap">
                                        {recipient.relatedBusinesses.map(biz => (
                                          <span key={biz} className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                            {biz}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={cn(
                                    "font-bold text-base",
                                    recipient.distributionAmount < 0 ? "text-red-600" : ""
                                  )}>
                                    ¥{recipient.distributionAmount.toLocaleString()}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {recipient.expenseReimbursement !== 0 ? (
                                    <button
                                      onClick={() => toggleExpenseDetails(expenseKey)}
                                      className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 transition-colors group/btn"
                                    >
                                      <Receipt className="w-4 h-4" />
                                      <span className={cn("font-bold text-base", recipient.expenseReimbursement < 0 ? "text-red-600" : "")}>
                                        ¥{recipient.expenseReimbursement.toLocaleString()}
                                      </span>
                                      <ChevronRight 
                                        className={cn(
                                          "w-4 h-4 transition-transform opacity-50 group-hover/btn:opacity-100",
                                          isExpenseExpanded && "rotate-90"
                                        )} 
                                      />
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground/50">-</span>
                                  )}
                                </TableCell>
                                <TableCell className={cn(
                                  "text-right font-bold text-lg",
                                  recipient.totalAmount < 0 ? "text-red-600" : "text-green-600"
                                )}>
                                  ¥{recipient.totalAmount.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center pr-6">
                                  {(() => {
                                    const dropdownKey = `${monthData.month}-simple-${recipient.recipientName}`;
                                    const currentStatus = getStatus(monthData.month, recipient.recipientName, '');
                                    const isOpen = openDropdown === dropdownKey;
                                    
                                    return (
                                      <div className="relative inline-block" ref={isOpen ? dropdownRef : null}>
                                        <button
                                          onClick={() => setOpenDropdown(isOpen ? null : dropdownKey)}
                                          className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer hover:opacity-80 shadow-sm border",
                                            currentStatus === 'paid' 
                                              ? "bg-green-100 text-green-800 hover:bg-green-200 border-green-200" 
                                              : "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200"
                                          )}
                                        >
                                          {currentStatus === 'paid' ? (
                                            <>
                                              <Check className="w-3.5 h-3.5" />
                                              振込済
                                            </>
                                          ) : (
                                            <>
                                              <Clock className="w-3.5 h-3.5" />
                                              未払
                                            </>
                                          )}
                                          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform opacity-50", isOpen && "rotate-180")} />
                                        </button>
                                        
                                        {isOpen && (
                                          <div className="absolute z-50 mt-1 right-0 bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100">
                                            <button
                                              onClick={() => handleStatusChange(monthData.month, recipient.recipientName, '', 'unpaid')}
                                              className={cn(
                                                "w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors",
                                                currentStatus === 'unpaid' && "bg-gray-50 font-medium text-gray-900"
                                              )}
                                            >
                                              <Clock className="w-4 h-4 text-gray-400" />
                                              <span>未払に戻す</span>
                                              {currentStatus === 'unpaid' && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                                            </button>
                                            <button
                                              onClick={() => handleStatusChange(monthData.month, recipient.recipientName, '', 'paid')}
                                              className={cn(
                                                "w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors",
                                                currentStatus === 'paid' && "bg-gray-50 font-medium text-gray-900"
                                              )}
                                            >
                                              <Check className="w-4 h-4 text-green-500" />
                                              <span>振込済にする</span>
                                              {currentStatus === 'paid' && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                              </TableRow>
                              
                              {/* 経費詳細の展開行 */}
                              {isExpenseExpanded && recipient.expenseDetails.length > 0 && (
                                <TableRow className="bg-orange-50/30">
                                  <TableCell colSpan={5} className="py-4 pl-0 pr-0">
                                    <div className="pl-20 pr-6 relative">
                                      <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-orange-200/50"></div>
                                      <div className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                                        <div className="p-1 bg-orange-100 rounded">
                                          <Receipt className="w-4 h-4" />
                                        </div>
                                        経費詳細（全事業合計）
                                      </div>
                                      <div className="grid gap-2">
                                        {recipient.expenseDetails.map((expense, idx) => (
                                          <div 
                                            key={expense.id || idx}
                                            className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-orange-100 shadow-sm"
                                          >
                                            <div className="flex items-center gap-4">
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-800">
                                                {expense.category}
                                              </span>
                                              <div className="flex flex-col">
                                                <span className="text-sm font-medium">
                                                  {expense.description || '(詳細なし)'}
                                                </span>
                                                <span className="text-xs text-muted-foreground mt-0.5">
                                                  {typeof expense.date === 'string' 
                                                    ? expense.date 
                                                    : format(expense.date, 'yyyy/MM/dd')
                                                  }
                                                </span>
                                              </div>
                                            </div>
                                            <span className={cn(
                                              "font-bold text-base",
                                              expense.amount < 0 ? "text-red-600" : "text-orange-600"
                                            )}>
                                              ¥{expense.amount.toLocaleString()}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
