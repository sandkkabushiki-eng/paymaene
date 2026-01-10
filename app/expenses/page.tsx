'use client';

import { useState, useEffect, useMemo } from 'react';
import { getExpenses, addExpense, updateExpense, deleteExpense, getAllPaymentSources, getAllExpenseCategories, getAllBusinesses } from '@/lib/supabase-db';
import { importCsvFile } from '@/lib/csvParser';
import { Expense, PaymentSource, ExpenseCategory, Business } from '@/lib/types';
import { format } from 'date-fns';
import { Plus, Upload, Search, Filter, Trash2, Edit2, X, Calendar, Wallet, CreditCard, Tag, ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { LoadingOverlay } from '@/components/ui/loading';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // 並列でマスタデータを取得（I/O最適化）
    const loadAll = async () => {
      await Promise.all([
        loadExpenses(),
        loadPaymentSources(),
        loadExpenseCategories(),
        loadBusinesses(),
      ]);
    };
    loadAll();
  }, [selectedMonth]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = selectedMonth 
        ? await getExpenses({ month: selectedMonth })
        : await getExpenses();
      setExpenses(data);
    } catch (error: any) {
      console.error('経費データの読み込みに失敗:', error);
      alert('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importCsvFile(file);
      alert(`取り込み完了: ${result.success}件追加、${result.skipped}件スキップ`);
      loadExpenses();
    } catch (error) {
      console.error('CSV取り込みに失敗:', error);
      alert('CSV取り込みに失敗しました');
    }
    
    // ファイル入力をリセット
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // 日付から自動的に月を計算
    const dateStr = formData.get('date') as string;
    let month = '';
    if (dateStr) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const monthNum = String(date.getMonth() + 1).padStart(2, '0');
      month = `${year}-${monthNum}`;
    }
    
    const isFixedCost = formData.get('isFixedCost') === 'on';
    
    const expenseData: Omit<Expense, 'id'> = {
      date: dateStr,
      month: month,
      business: formData.get('business') as string || '',
      paymentSource: formData.get('paymentSource') as string || '',
      category: formData.get('category') as string || '',
      description: formData.get('description') as string || '',
      amount: parseFloat(formData.get('amount') as string) || 0,
      memo: formData.get('memo') as string || '',
      sourceData: formData.get('sourceData') as string || '',
      isFixedCost: isFixedCost,
    };

    try {
      if (editingExpense?.id) {
        // 編集の場合、既存の固定費を削除してから再作成
        const wasFixedCost = editingExpense.isFixedCost || editingExpense.fixedCostId;
        if (wasFixedCost) {
          // 既存の固定費を削除（元データ以外）- 並列化でN+1解消
          const existingFixedCosts = await getExpenses();
          const fixedCostId = editingExpense.fixedCostId || editingExpense.id;
          const fixedCostsToDelete = existingFixedCosts.filter(
            exp => (exp.fixedCostId === fixedCostId || exp.id === fixedCostId) && exp.id !== editingExpense.id
          );
          await Promise.all(
            fixedCostsToDelete.filter(exp => exp.id).map(exp => deleteExpense(exp.id!))
          );
        }
        
        await updateExpense(editingExpense.id, expenseData);
        
        // 固定費の場合、全月に展開 - 並列化でN+1解消
        if (isFixedCost) {
          const months = generateMonthOptions();
          const baseExpense = { ...expenseData };
          
          const editId = editingExpense.id!;
          const operations = months.map(targetMonth => {
            if (targetMonth !== month) {
              return addExpense({
                ...baseExpense,
                month: targetMonth,
                date: `${targetMonth}-01`,
                isFixedCost: true,
                fixedCostId: editId,
              });
            } else {
              // 元データにもfixedCostIdを設定
              return updateExpense(editId, { fixedCostId: editId });
            }
          });
          await Promise.all(operations);
        }
      } else {
        // 新規追加
        const addedExpense = await addExpense(expenseData);
        const addedId = addedExpense.id!;
        
        // 固定費の場合、全月に展開 - 並列化でN+1解消
        if (isFixedCost) {
          const months = generateMonthOptions();
          const baseExpense = { ...expenseData };
          
          const operations = months.map(targetMonth => {
            if (targetMonth !== month) {
              return addExpense({
                ...baseExpense,
                month: targetMonth,
                date: `${targetMonth}-01`,
                isFixedCost: true,
                fixedCostId: addedId,
              });
            } else {
              // 元の経費にもfixedCostIdを設定（自分自身を参照）
              return updateExpense(addedId, { fixedCostId: addedId });
            }
          });
          await Promise.all(operations);
        }
      }
      setShowForm(false);
      setEditingExpense(null);
      loadExpenses();
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('経費データの保存に失敗:', errorMessage, error);
      alert(`保存に失敗しました: ${errorMessage}`);
    }
  };

  const handleDelete = async (id: string) => {
    const expense = expenses.find(exp => exp.id === id);
    const isFixedCost = expense?.isFixedCost || expense?.fixedCostId;
    
    if (isFixedCost) {
      if (!confirm('固定費を削除しますか？\n全月の固定費も削除されます。')) return;
    } else {
      if (!confirm('この経費を削除しますか？')) return;
    }
    
    try {
      if (isFixedCost) {
        // 並列化でN+1解消
        const fixedCostId = expense?.fixedCostId || id;
        const allExpenses = await getExpenses();
        const fixedCostsToDelete = allExpenses.filter(
          exp => exp.fixedCostId === fixedCostId || exp.id === fixedCostId
        );
        
        await Promise.all(
          fixedCostsToDelete.filter(exp => exp.id).map(exp => deleteExpense(exp.id!))
        );
      } else {
        await deleteExpense(id);
      }
      loadExpenses();
    } catch (error) {
      console.error('経費データの削除に失敗:', error);
      alert('削除に失敗しました');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const loadPaymentSources = async () => {
    try {
      const data = await getAllPaymentSources();
      setPaymentSources(data);
    } catch (error) {
      console.error('支払い元データの読み込みに失敗:', error);
    }
  };

  const loadExpenseCategories = async () => {
    try {
      const data = await getAllExpenseCategories();
      setExpenseCategories(data);
    } catch (error) {
      console.error('経費カテゴリーデータの読み込みに失敗:', error);
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

  const generateMonthOptions = () => {
    const months = [];
    const startDate = new Date(2025, 9, 1); // 2025年10月
    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
    }
    return months;
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.business?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [expenses, searchTerm]);

  // 統計データの計算
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const count = filteredExpenses.length;
    const fixedCosts = filteredExpenses.filter(e => e.isFixedCost || e.fixedCostId).reduce((sum, exp) => sum + exp.amount, 0);
    return { total, count, fixedCosts };
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      {/* ヘッダーセクション */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/20 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">経費管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            日々の経費を記録・分析します
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" className="relative cursor-pointer hover:bg-white/80 transition-colors shadow-sm flex-1 md:flex-none">
            <Upload className="mr-2 h-4 w-4" />
            CSV取込
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </Button>
          <Button 
            onClick={() => {
              setEditingExpense(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all hover:shadow-lg flex-1 md:flex-none"
          >
            <Plus className="mr-2 h-4 w-4" />
            新規追加
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/60 backdrop-blur-sm shadow-sm border-white/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100/50 text-blue-600">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">合計経費</p>
                <h3 className="text-2xl font-bold text-slate-900">¥{stats.total.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-sm shadow-sm border-white/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-100/50 text-indigo-600">
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">経費件数</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.count}件</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/60 backdrop-blur-sm shadow-sm border-white/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100/50 text-orange-600">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">うち固定費</p>
                <h3 className="text-2xl font-bold text-slate-900">¥{stats.fixedCosts.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* メインコンテンツ */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-md overflow-hidden">
        <CardHeader className="pb-4 border-b border-gray-100/50 bg-white/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <span className="w-1 h-6 rounded-full bg-blue-500"></span>
              経費一覧
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="内容、カテゴリ、事業で検索..."
                  className="pl-9 h-10 bg-white/50 border-gray-200 focus:bg-white transition-all rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-[180px]">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 rounded-xl border border-gray-200 bg-white/50 focus:bg-white text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer transition-all"
                  >
                    <option value="">すべての期間</option>
                    {generateMonthOptions().map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <ArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none opacity-50" />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12">
              <LoadingOverlay />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
              <div className="p-4 bg-gray-50 rounded-full">
                <Filter className="h-8 w-8 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">経費データが見つかりません</p>
                <p className="text-sm mt-1">条件を変更するか、新しい経費を追加してください</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-gray-100">
                    <TableHead className="w-[120px] font-semibold text-gray-600 pl-6">日付</TableHead>
                    <TableHead className="w-[140px] font-semibold text-gray-600">事業</TableHead>
                    <TableHead className="w-[140px] font-semibold text-gray-600">支払元</TableHead>
                    <TableHead className="w-[120px] font-semibold text-gray-600">カテゴリ</TableHead>
                    <TableHead className="font-semibold text-gray-600">内容</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 w-[120px]">金額</TableHead>
                    <TableHead className="w-[100px] font-semibold text-gray-600">種別</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 w-[100px] pr-6">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow 
                      key={expense.id} 
                      className="group hover:bg-blue-50/30 transition-colors border-gray-50"
                    >
                      <TableCell className="font-medium pl-6">
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium">
                            {expense.date instanceof Date 
                              ? format(expense.date, 'MM/dd')
                              : expense.date ? expense.date.split('-').slice(1).join('/') : '-'}
                          </span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {expense.date instanceof Date 
                              ? format(expense.date, 'yyyy')
                              : expense.date ? expense.date.split('-')[0] : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {expense.business ? (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <span className="text-sm font-medium text-gray-700">{expense.business}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.paymentSource ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CreditCard className="h-3 w-3 text-gray-400" />
                            {expense.paymentSource}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          {expense.category || '未分類'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <div className="truncate font-medium text-gray-900" title={expense.description}>
                          {expense.description}
                        </div>
                        {expense.memo && (
                          <div className="truncate text-xs text-gray-500 mt-0.5" title={expense.memo}>
                            {expense.memo}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-gray-900">
                        ¥{expense.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {expense.isFixedCost ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                            <ArrowUp className="h-3 w-3" />
                            固定費
                          </span>
                        ) : expense.fixedCostId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            <ArrowDown className="h-3 w-3" />
                            自動
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100">
                            通常
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(expense)}
                            disabled={!!expense.fixedCostId && expense.fixedCostId !== expense.id}
                            className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600 rounded-lg"
                            title="編集"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(expense.id!)}
                            disabled={!!expense.fixedCostId && expense.fixedCostId !== expense.id}
                            className="h-8 w-8 hover:bg-red-100 hover:text-red-600 rounded-lg"
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* モーダルフォーム */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingExpense ? '経費を編集' : '経費を登録'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  必要な情報を入力してください
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">日付 <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Input
                      type="date"
                      name="date"
                      defaultValue={editingExpense?.date instanceof Date 
                        ? format(editingExpense.date, 'yyyy-MM-dd')
                        : editingExpense?.date || ''}
                      required
                      className="pl-3 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all rounded-xl"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">金額 <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
                    <Input
                      type="number"
                      name="amount"
                      defaultValue={editingExpense?.amount || ''}
                      required
                      className="pl-7 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all rounded-xl font-medium"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">事業</label>
                  <div className="relative">
                    <select
                      name="business"
                      defaultValue={editingExpense?.business || ''}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none cursor-pointer transition-all"
                    >
                      <option value="">選択してください</option>
                      {businesses.map(business => (
                        <option key={business.id} value={business.name}>{business.name}</option>
                      ))}
                    </select>
                    <ArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none opacity-50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">支払元</label>
                  <div className="relative">
                    <select
                      name="paymentSource"
                      defaultValue={editingExpense?.paymentSource || ''}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none cursor-pointer transition-all"
                    >
                      <option value="">選択してください</option>
                      {paymentSources.map(source => (
                        <option key={source.id} value={source.name}>{source.name}</option>
                      ))}
                    </select>
                    <ArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none opacity-50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">カテゴリ</label>
                  <div className="relative">
                    <select
                      name="category"
                      defaultValue={editingExpense?.category || ''}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none cursor-pointer transition-all"
                    >
                      <option value="">選択してください</option>
                      {expenseCategories.map(category => (
                        <option key={category.id} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                    <ArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none opacity-50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">内容</label>
                  <Input
                    type="text"
                    name="description"
                    defaultValue={editingExpense?.description || ''}
                    placeholder="例: 交通費、消耗品など"
                    className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all rounded-xl"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-gray-700">メモ</label>
                  <textarea
                    name="memo"
                    defaultValue={editingExpense?.memo || ''}
                    className="flex min-h-[80px] w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:bg-white transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="補足事項があれば入力してください"
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-start space-x-3 p-4 border border-blue-100 rounded-xl bg-blue-50/50">
                    <input
                      type="checkbox"
                      name="isFixedCost"
                      id="isFixedCost"
                      defaultChecked={editingExpense?.isFixedCost || false}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="space-y-1 cursor-pointer" onClick={() => document.getElementById('isFixedCost')?.click()}>
                      <label htmlFor="isFixedCost" className="text-sm font-semibold text-blue-900 cursor-pointer">
                        固定費として登録
                      </label>
                      <p className="text-xs text-blue-700/80">
                        チェックを入れると、2025年10月から2026年9月までの全月に自動的にこの経費が反映されます。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="h-11 px-6 rounded-xl hover:bg-gray-100 border-gray-200"
                >
                  キャンセル
                </Button>
                <Button 
                  type="submit"
                  className="h-11 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                >
                  {editingExpense ? '更新する' : '登録する'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
