'use client';

import { useState, useEffect } from 'react';
import { getAllProfits, getProfit, updateProfit, addProfit, deleteProfit, calculateProfitForMonth, getAllBusinesses, getExpenses } from '@/lib/supabase-db';
import { Profit, Business } from '@/lib/types';
import { format, subMonths, addMonths } from 'date-fns';
import { RefreshCw, ChevronDown, ChevronRight, Save, Trash2, TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function ProfitsPage() {
  const [profits, setProfits] = useState<Profit[]>([]);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expandedBusiness, setExpandedBusiness] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, Record<string, number | null>>>({});
  const [taxRate, setTaxRate] = useState<number>(20);
  const [startMonth, setStartMonth] = useState<Date>(new Date(new Date().getFullYear(), 0, 1)); // デフォルト: 今年の1月

  useEffect(() => {
    loadBusinesses();
    loadProfits();
    loadExpenses();
  }, []);

  const loadProfits = async (): Promise<void> => {
    try {
      setLoading(true);
      const allProfits = await getAllProfits();
      setProfits(allProfits);
    } catch (error: any) {
      console.error('利益データの読み込みに失敗:', error);
      alert('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinesses = async () => {
    try {
      const data = await getAllBusinesses();
      setBusinesses(data);
    } catch (error) {
      console.error('事業データの読み込みに失敗:', error);
    }
  };

  const loadExpenses = async () => {
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('経費データの読み込みに失敗:', error);
    }
  };

  const getBusinessExpenseByMonth = (businessName: string, month: string): number => {
    return expenses
      .filter(expense => expense.business === businessName && expense.month === month)
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getBusinessRevenueByMonth = (businessName: string, month: string): number => {
    const editingValue = editingValues[month]?.[businessName];
    if (editingValue !== undefined && editingValue !== null) {
      return Number(editingValue);
    }
    const profit = profits.find(p => p.month === month);
    return profit?.revenues?.[businessName] || 0;
  };

  // 表示する月のリストを生成（開始月から12ヶ月分 + 前後の期間調整機能用）
  const generateMonths = (): string[] => {
    const months = [];
    // 開始月から12ヶ月分生成
    for (let i = 0; i < 12; i++) {
      const date = addMonths(startMonth, i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
    }
    return months;
  };

  const handleRevenueChange = (month: string, businessName: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setEditingValues(prev => ({
      ...prev,
      [month]: {
        ...prev[month],
        [businessName]: isNaN(numValue as number) ? null : numValue,
      },
    }));
  };

  const getDisplayValue = (month: string, businessName: string): string => {
    const editingValue = editingValues[month]?.[businessName];
    if (editingValue !== undefined) {
      if (editingValue === null) return '';
      return String(editingValue);
    }
    const profit = profits.find(p => p.month === month);
    if (!profit) return '';
    const savedValue = profit.revenues?.[businessName];
    if (savedValue === undefined || savedValue === null) return '';
    return String(savedValue);
  };

  const handleSaveRevenue = async (month: string, businessName: string) => {
    try {
      const inputValue = editingValues[month]?.[businessName];
      if (inputValue === null || inputValue === undefined) return;
      
      const value = Number(inputValue);
      if (isNaN(value) || value < 0) {
        alert('有効な数値を入力してください');
        return;
      }
      
      const existingProfit = await getProfit(month);
      let existingRevenues: Record<string, number> = existingProfit?.revenues || {};
      const updatedRevenues = { ...existingRevenues, [businessName]: value };
      
      const totalExpense = expenses
        .filter(expense => expense.month === month)
        .reduce((sum, expense) => sum + expense.amount, 0);
      
      const totalRevenue = Object.values(updatedRevenues).reduce((sum, rev) => sum + (rev || 0), 0);
      
      const profitData = {
        month,
        revenues: updatedRevenues,
        totalRevenue,
        totalExpense,
        grossProfit: totalRevenue,
        netProfit: totalRevenue - totalExpense,
      };
      
      if (existingProfit?.id) {
        await updateProfit(existingProfit.id, profitData);
      } else {
        await addProfit(profitData);
      }
      
      setEditingValues(prev => {
        const updated = { ...prev };
        if (updated[month]) {
          delete updated[month][businessName];
          if (Object.keys(updated[month]).length === 0) {
            delete updated[month];
          }
        }
        return updated;
      });
      
      await loadProfits();
    } catch (error: any) {
      console.error('売上データの更新に失敗:', error);
      alert('更新に失敗しました');
    }
  };

  const handleDeleteProfit = async (month: string) => {
    if (!confirm(`${month}の利益データを削除しますか？`)) return;
    
    try {
      const existingProfit = await getProfit(month);
      if (!existingProfit || !existingProfit.id) {
        alert('削除するデータが見つかりませんでした');
        return;
      }
      await deleteProfit(existingProfit.id);
      await loadProfits();
    } catch (error: any) {
      console.error('利益データの削除に失敗:', error);
      alert('削除に失敗しました');
    }
  };

  const recalculateAll = async () => {
    try {
      setLoading(true);
      const months = generateMonths();
      for (const month of months) {
        const calculated = await calculateProfitForMonth(month);
        const existing = await getProfit(month);
        if (existing) {
          await updateProfit(existing.id!, calculated);
        }
      }
      loadProfits();
      alert('再計算が完了しました');
    } catch (error) {
      console.error('再計算に失敗:', error);
      alert('再計算に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 期間操作
  const handlePrevYear = () => setStartMonth(subMonths(startMonth, 12));
  const handleNextYear = () => setStartMonth(addMonths(startMonth, 12));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">利益管理</h1>
          <p className="text-muted-foreground mt-1">
            月ごとの売上、経費、利益を管理します
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={recalculateAll} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            再計算
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>利益一覧</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                <span className="text-sm font-medium">税率:</span>
                <div className="relative">
                  <Input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="w-16 h-8 text-right pr-6"
                    min={0}
                    max={100}
                  />
                  <span className="absolute right-2 top-1.5 text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevYear}>
                  &lt; 前の年
                </Button>
                <span className="text-sm font-medium w-32 text-center">
                  {format(startMonth, 'yyyy年MM月')} 〜
                </span>
                <Button variant="outline" size="sm" onClick={handleNextYear}>
                  次の年 &gt;
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              事業が登録されていません
            </div>
          ) : (
            <div className="space-y-4">
              {businesses.map((business) => {
                const isExpanded = expandedBusiness === business.name;
                const months = generateMonths();
                
                // 合計計算
                const totalRevenue = months.reduce((sum, month) => sum + getBusinessRevenueByMonth(business.name, month), 0);
                const totalExpense = months.reduce((sum, month) => sum + getBusinessExpenseByMonth(business.name, month), 0);
                const totalGrossProfit = totalRevenue - totalExpense;
                const totalTax = totalGrossProfit > 0 ? Math.floor(totalGrossProfit * taxRate / 100) : 0;
                const totalNetProfit = totalGrossProfit - totalTax;
                
                return (
                  <div key={business.id} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpandedBusiness(isExpanded ? null : business.name)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        <span className="font-semibold text-lg">{business.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-8 text-sm">
                        <div className="text-right hidden md:block">
                          <div className="text-muted-foreground text-xs mb-0.5">売上</div>
                          <div className="font-medium">¥{totalRevenue.toLocaleString()}</div>
                        </div>
                        <div className="text-right hidden md:block">
                          <div className="text-muted-foreground text-xs mb-0.5">経費</div>
                          <div className="font-medium text-red-600">¥{totalExpense.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground text-xs mb-0.5">粗利</div>
                          <div className={cn("font-medium", totalGrossProfit >= 0 ? "text-blue-600" : "text-red-600")}>
                            ¥{totalGrossProfit.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground text-xs mb-0.5">純利益</div>
                          <div className={cn("font-bold text-base", totalNetProfit >= 0 ? "text-green-600" : "text-red-600")}>
                            ¥{totalNetProfit.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="border-t animate-accordion-down">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-[100px]">月</TableHead>
                              <TableHead className="text-right">売上 (入力)</TableHead>
                              <TableHead className="text-right">経費</TableHead>
                              <TableHead className="text-right text-blue-600">粗利</TableHead>
                              <TableHead className="text-right text-orange-600">税金</TableHead>
                              <TableHead className="text-right font-bold text-green-600">純利益</TableHead>
                              <TableHead className="text-center w-[100px]">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {months.map((month) => {
                              const displayValue = getDisplayValue(month, business.name);
                              const savedRevenue = getBusinessRevenueByMonth(business.name, month);
                              const expense = getBusinessExpenseByMonth(business.name, month);
                              const inputValue = editingValues[month]?.[business.name];
                              const currentRevenue = inputValue !== undefined && inputValue !== null ? Number(inputValue) : savedRevenue;
                              const grossProfit = currentRevenue - expense;
                              const tax = grossProfit > 0 ? Math.floor(grossProfit * taxRate / 100) : 0;
                              const netProfit = grossProfit - tax;
                              const hasUnsavedChanges = inputValue !== undefined;
                              
                              return (
                                <TableRow key={month}>
                                  <TableCell className="font-medium">{month}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="relative w-32">
                                        <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">¥</span>
                                        <Input
                                          type="number"
                                          value={displayValue}
                                          onChange={(e) => handleRevenueChange(month, business.name, e.target.value)}
                                          className="h-8 text-right pl-5 pr-2"
                                          placeholder="0"
                                        />
                                      </div>
                                      {hasUnsavedChanges && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveRevenue(month, business.name)}
                                          className="h-8 w-8 p-0"
                                          title="保存"
                                        >
                                          <Save className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-red-600">
                                    ¥{expense.toLocaleString()}
                                  </TableCell>
                                  <TableCell className={cn("text-right font-medium", grossProfit >= 0 ? "text-blue-600" : "text-red-600")}>
                                    ¥{grossProfit.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right text-orange-600">
                                    ¥{tax.toLocaleString()}
                                  </TableCell>
                                  <TableCell className={cn("text-right font-bold", netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                                    ¥{netProfit.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteProfit(month)}
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                                      title="データを削除"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-muted/50 font-semibold">
                              <TableCell>合計</TableCell>
                              <TableCell className="text-right">¥{totalRevenue.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-red-600">¥{totalExpense.toLocaleString()}</TableCell>
                              <TableCell className={cn("text-right", totalGrossProfit >= 0 ? "text-blue-600" : "text-red-600")}>
                                ¥{totalGrossProfit.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-orange-600">¥{totalTax.toLocaleString()}</TableCell>
                              <TableCell className={cn("text-right", totalNetProfit >= 0 ? "text-green-600" : "text-red-600")}>
                                ¥{totalNetProfit.toLocaleString()}
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
