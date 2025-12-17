'use client';

import { useState, useEffect } from 'react';
import { getAllBusinesses, getExpenses, getAllRevenueDistributions, getAllProfits } from '@/lib/supabase-db';
import { Business } from '@/lib/types';
import { format } from 'date-fns';
import { Banknote, Filter, Download, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

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

export default function TransfersPage() {
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessRecipientData, setBusinessRecipientData] = useState<BusinessRecipientData[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all'); // デフォルトは全事業
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const businessesData = await getAllBusinesses();
      setBusinesses(businessesData);
      
      const expenses = await getExpenses();
      const allProfits = await getAllProfits();
      const distributionsData = await getAllRevenueDistributions();
      
      // 分配データを整形
      const distributions = distributionsData.map(dist => ({
        id: dist.id,
        businessName: dist.businessName,
        recipientName: dist.recipientName,
        distributionType: dist.distributionType,
        value: dist.value,
      }));
      
      // 月ごとのデータを構築
      const monthMap: Record<string, { revenue: number; expense: number }> = {};
      const monthGroups: Record<string, typeof allProfits> = {};
      
      allProfits.forEach(profit => {
        const month = profit.month;
        if (!month) return;
        if (!monthGroups[month]) monthGroups[month] = [];
        monthGroups[month].push(profit);
        
        if (!monthMap[month]) monthMap[month] = { revenue: 0, expense: 0 };
      });
      
      // 経費の立て替え情報を取得
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
      
      // 事業ごとに分配先データを整理
      const businessRecipientMap: Record<string, Record<string, Record<string, { distributionAmount: number; expenseReimbursement: number }>>> = {};
      
      businessesData.forEach(business => {
        if (!businessRecipientMap[business.name]) businessRecipientMap[business.name] = {};
        
        const bizDistributions = distributions.filter(d => d.businessName === business.name);
        
        // 分配先ごとに月別データを構築
        bizDistributions.forEach(dist => {
          if (!businessRecipientMap[business.name][dist.recipientName]) {
            businessRecipientMap[business.name][dist.recipientName] = {};
          }
          
          Object.keys(monthGroups).forEach(month => {
            let bizRevenue = 0;
            let bizExpense = 0;
            
            if (monthGroups[month] && monthGroups[month].length > 0) {
              const latestProfit = monthGroups[month][0];
              const revenues = latestProfit.revenues || {};
              bizRevenue = revenues[business.name] || 0;
            }
            
            expenses.forEach((exp: any) => {
              if (exp.month === month && exp.business === business.name) {
                bizExpense += exp.amount;
              }
            });
            
            const bizProfit = bizRevenue - bizExpense;
            
            // 固定金額合計
            const totalFixed = bizDistributions
              .filter(d => d.distributionType === 'amount')
              .reduce((s, d) => s + d.value, 0);
            
            const profitAfterFixed = bizProfit - totalFixed;
            
            let distributionAmount = 0;
            if (dist.distributionType === 'amount') {
              distributionAmount = dist.value;
            } else {
              distributionAmount = Math.floor(profitAfterFixed * dist.value / 100);
            }
            
            if (!businessRecipientMap[business.name][dist.recipientName][month]) {
              businessRecipientMap[business.name][dist.recipientName][month] = {
                distributionAmount: 0,
                expenseReimbursement: 0,
              };
            }
            businessRecipientMap[business.name][dist.recipientName][month].distributionAmount += distributionAmount;
          });
        });
        
        // 経費立て替えを追加
        Object.keys(expenseByPayerMap).forEach(payerName => {
          Object.entries(expenseByPayerMap[payerName]).forEach(([month, amount]) => {
            const isBusinessExpense = expenses.some((exp: any) => 
              exp.month === month && 
              exp.business === business.name && 
              exp.paymentSource === payerName
            );
            
            if (isBusinessExpense) {
              if (!businessRecipientMap[business.name][payerName]) {
                businessRecipientMap[business.name][payerName] = {};
              }
              if (!businessRecipientMap[business.name][payerName][month]) {
                businessRecipientMap[business.name][payerName][month] = {
                  distributionAmount: 0,
                  expenseReimbursement: 0,
                };
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
          })).sort((a, b) => a.month.localeCompare(b.month)); // 古い順
          
          return {
            recipientName,
            amounts,
          };
        });
        
        return {
          businessName,
          recipients,
        };
      });
      
      setBusinessRecipientData(businessRecipientDataArray);
      
    } catch (error) {
      console.error('データの読み込みに失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 全事業データを統合する関数
  const getAggregatedData = () => {
    if (selectedBusiness !== 'all') {
      const data = businessRecipientData.find(b => b.businessName === selectedBusiness);
      return data ? data.recipients : [];
    }

    // 全事業のデータを集計
    const aggregatedMap: Record<string, Record<string, { distributionAmount: number; expenseReimbursement: number; amount: number }>> = {};

    businessRecipientData.forEach(bizData => {
      bizData.recipients.forEach(recipient => {
        if (!aggregatedMap[recipient.recipientName]) {
          aggregatedMap[recipient.recipientName] = {};
        }

        recipient.amounts.forEach(amt => {
          if (!aggregatedMap[recipient.recipientName][amt.month]) {
            aggregatedMap[recipient.recipientName][amt.month] = {
              distributionAmount: 0,
              expenseReimbursement: 0,
              amount: 0,
            };
          }
          aggregatedMap[recipient.recipientName][amt.month].distributionAmount += amt.distributionAmount;
          aggregatedMap[recipient.recipientName][amt.month].expenseReimbursement += amt.expenseReimbursement;
          aggregatedMap[recipient.recipientName][amt.month].amount += amt.amount;
        });
      });
    });

    return Object.entries(aggregatedMap).map(([recipientName, monthMap]) => ({
      recipientName,
      amounts: Object.entries(monthMap).map(([month, data]) => ({
        month,
        ...data
      })).sort((a, b) => a.month.localeCompare(b.month))
    }));
  };

  const recipients = getAggregatedData();
  
  // 表示する月のリストを取得（重複なし、ソート済み）
  const allMonths = Array.from(new Set(
    recipients.flatMap(r => r.amounts.map(a => a.month))
  )).sort().reverse(); // 新しい順

  // フィルタリングされた月
  const filteredMonths = selectedMonth ? [selectedMonth] : allMonths;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">振り込み管理</h1>
          <p className="text-muted-foreground mt-1">
            月ごとの分配金と経費精算額を確認します
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="w-64">
          <label className="text-sm font-medium mb-1 block">事業を選択</label>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">すべての事業</option>
            {businesses.map(business => (
              <option key={business.id} value={business.name}>{business.name}</option>
            ))}
          </select>
        </div>
        
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
      ) : recipients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">データがありません</div>
      ) : (
        <div className="grid gap-6">
          {filteredMonths.map(month => {
             // 月ごとの総合計を計算
             const monthTotal = recipients.reduce((sum, r) => {
               const amount = r.amounts.find(a => a.month === month)?.amount || 0;
               return sum + amount;
             }, 0);

             if (monthTotal === 0 && recipients.every(r => {
               const data = r.amounts.find(a => a.month === month);
               return !data || data.amount === 0;
             })) return null;

             return (
              <Card key={month}>
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <CardTitle>{month}</CardTitle>
                      {selectedBusiness === 'all' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          全事業合計
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      合計支払額: <span className="font-bold text-foreground text-lg">
                        ¥{monthTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>支払先</TableHead>
                        <TableHead className="text-right">分配金</TableHead>
                        <TableHead className="text-right">経費立替</TableHead>
                        <TableHead className="text-right font-bold">合計支払額</TableHead>
                        <TableHead className="text-center">ステータス</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map(recipient => {
                        const amountData = recipient.amounts.find(a => a.month === month);
                        if (!amountData || amountData.amount === 0) return null;
                        
                        return (
                          <TableRow key={recipient.recipientName}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                  {recipient.recipientName.slice(0, 1)}
                                </div>
                                {recipient.recipientName}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ¥{amountData.distributionAmount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              ¥{amountData.expenseReimbursement.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600 text-lg">
                              ¥{amountData.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                未払
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
