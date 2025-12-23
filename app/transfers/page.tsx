'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getAllBusinesses, getExpenses, getAllRevenueDistributions, getAllProfits, getAllTransferStatuses, upsertTransferStatus } from '@/lib/supabase-db';
import { Business, TransferStatus, Expense, RevenueDistribution } from '@/lib/types';
import { format } from 'date-fns';
import { Banknote, Filter, Download, Wallet, Check, Clock, ChevronDown, Building2, Receipt, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  businessColor?: string;
  recipients: RecipientData[];
  totalDistribution: number;
  totalExpense: number;
  totalAmount: number;
}

interface MonthData {
  month: string;
  businesses: BusinessMonthData[];
  grandTotal: number;
}

export default function TransfersPage() {
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [transferStatuses, setTransferStatuses] = useState<TransferStatus[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
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
      
      const businessesData = await getAllBusinesses();
      setBusinesses(businessesData);
      
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
          
          return {
            businessName: business.name,
            businessColor: business.color,
            recipients,
            totalDistribution,
            totalExpense,
            totalAmount,
          };
        }).filter(b => b.totalAmount !== 0);
        
        const grandTotal = businessDataArray.reduce((sum, b) => sum + b.totalAmount, 0);
        
        return {
          month,
          businesses: businessDataArray,
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
    const status = transferStatuses.find(
      s => s.month === month && s.recipientName === recipientName && s.businessName === businessName
    );
    return status?.status || 'unpaid';
  };

  // ローカルステートを更新するヘルパー関数
  const updateLocalStatus = (month: string, recipientName: string, businessName: string, newStatus: 'unpaid' | 'paid') => {
    setTransferStatuses(prev => {
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
      await upsertTransferStatus({
        month,
        recipientName,
        businessName,
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : null,
        memo: '',
      });
    } catch (error: any) {
      // DBへの保存が失敗してもローカルでは更新済み
      // テーブルが存在しない場合の警告
      console.warn('ステータスをDBに保存できませんでした（テーブルが未作成の可能性があります）:', error?.message || error?.code || 'Unknown error');
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">振り込み管理</h1>
          <p className="text-muted-foreground mt-1">
            月ごと・事業ごとの分配金と経費精算額を確認します
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">月で絞り込み</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold">{monthData.month}</h2>
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  <span className="text-sm opacity-80">月間合計支払額:</span>
                  <span className="text-2xl font-bold">¥{monthData.grandTotal.toLocaleString()}</span>
                </div>
              </div>
              
              {/* 事業ごとのカード */}
              {monthData.businesses.map(business => (
                <Card key={business.businessName} className="overflow-hidden">
                  <CardHeader 
                    className="py-4 border-b"
                    style={{ 
                      background: `linear-gradient(135deg, ${business.businessColor || '#3b82f6'}15, ${business.businessColor || '#3b82f6'}05)`,
                      borderLeft: `4px solid ${business.businessColor || '#3b82f6'}`
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Building2 
                          className="w-5 h-5" 
                          style={{ color: business.businessColor || '#3b82f6' }}
                        />
                        <CardTitle className="text-lg">{business.businessName}</CardTitle>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-muted-foreground">
                          分配金: <span className="font-semibold text-foreground">¥{business.totalDistribution.toLocaleString()}</span>
                        </div>
                        <div className="text-muted-foreground">
                          経費立替: <span className="font-semibold text-orange-600">¥{business.totalExpense.toLocaleString()}</span>
                        </div>
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">
                          合計: ¥{business.totalAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-[180px]">支払先</TableHead>
                          <TableHead className="text-right w-[180px]">分配金</TableHead>
                          <TableHead className="text-right w-[220px]">経費立替</TableHead>
                          <TableHead className="text-right w-[140px] font-bold">合計支払額</TableHead>
                          <TableHead className="text-center w-[120px]">ステータス</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {business.recipients.map(recipient => {
                          const expenseKey = `${monthData.month}-${business.businessName}-${recipient.recipientName}`;
                          const isExpenseExpanded = expandedExpenses.has(expenseKey);
                          
                          return (
                            <React.Fragment key={recipient.recipientName}>
                              <TableRow>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                      style={{ backgroundColor: business.businessColor || '#3b82f6' }}
                                    >
                                      {recipient.recipientName.slice(0, 1)}
                                    </div>
                                    {recipient.recipientName}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {recipient.distributionAmount > 0 ? (
                                    <div>
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium mb-1">
                                        {recipient.distributionType === 'percentage' 
                                          ? `${recipient.distributionValue}%` 
                                          : `固定 ¥${recipient.distributionValue.toLocaleString()}`
                                        }
                                      </span>
                                      <div className="font-semibold">
                                        ¥{recipient.distributionAmount.toLocaleString()}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {recipient.expenseReimbursement > 0 ? (
                                    <div>
                                      <button
                                        onClick={() => toggleExpenseDetails(expenseKey)}
                                        className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 transition-colors"
                                      >
                                        <Receipt className="w-4 h-4" />
                                        <span className="font-semibold">
                                          ¥{recipient.expenseReimbursement.toLocaleString()}
                                        </span>
                                        <ChevronRight 
                                          className={cn(
                                            "w-4 h-4 transition-transform",
                                            isExpenseExpanded && "rotate-90"
                                          )} 
                                        />
                                      </button>
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {recipient.expenseDetails.length}件の経費
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-bold text-green-600 text-lg">
                                  ¥{recipient.totalAmount.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center">
                                  {(() => {
                                    const dropdownKey = `${monthData.month}-${business.businessName}-${recipient.recipientName}`;
                                    const currentStatus = getStatus(monthData.month, recipient.recipientName, business.businessName);
                                    const isOpen = openDropdown === dropdownKey;
                                    
                                    return (
                                      <div className="relative inline-block" ref={isOpen ? dropdownRef : null}>
                                        <button
                                          onClick={() => setOpenDropdown(isOpen ? null : dropdownKey)}
                                          className={cn(
                                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer hover:opacity-80",
                                            currentStatus === 'paid' 
                                              ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                          )}
                                        >
                                          {currentStatus === 'paid' ? (
                                            <>
                                              <Check className="w-3 h-3" />
                                              振込済
                                            </>
                                          ) : (
                                            <>
                                              <Clock className="w-3 h-3" />
                                              未払
                                            </>
                                          )}
                                          <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
                                        </button>
                                        
                                        {isOpen && (
                                          <div className="absolute z-50 mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
                                            <button
                                              onClick={() => handleStatusChange(monthData.month, recipient.recipientName, business.businessName, 'unpaid')}
                                              className={cn(
                                                "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors",
                                                currentStatus === 'unpaid' && "bg-gray-50"
                                              )}
                                            >
                                              <Clock className="w-4 h-4 text-gray-500" />
                                              <span>未払</span>
                                              {currentStatus === 'unpaid' && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                                            </button>
                                            <button
                                              onClick={() => handleStatusChange(monthData.month, recipient.recipientName, business.businessName, 'paid')}
                                              className={cn(
                                                "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors",
                                                currentStatus === 'paid' && "bg-gray-50"
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
                                <TableRow className="bg-orange-50/50">
                                  <TableCell colSpan={5} className="py-3">
                                    <div className="pl-10">
                                      <div className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                                        <Receipt className="w-4 h-4" />
                                        経費詳細
                                      </div>
                                      <div className="grid gap-2">
                                        {recipient.expenseDetails.map((expense, idx) => (
                                          <div 
                                            key={expense.id || idx}
                                            className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-orange-200"
                                          >
                                            <div className="flex items-center gap-4">
                                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                {expense.category}
                                              </span>
                                              <span className="text-sm">
                                                {expense.description || '(詳細なし)'}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {typeof expense.date === 'string' 
                                                  ? expense.date 
                                                  : format(expense.date, 'yyyy/MM/dd')
                                                }
                                              </span>
                                            </div>
                                            <span className="font-semibold text-orange-600">
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
          ))}
        </div>
      )}
    </div>
  );
}
