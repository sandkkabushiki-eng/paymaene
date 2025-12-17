'use client';

import { useState, useEffect } from 'react';
import { getExpenses, addExpense, updateExpense, deleteExpense, getAllPaymentSources, getAllExpenseCategories, getAllBusinesses } from '@/lib/supabase-db';
import { importCsvFile } from '@/lib/csvParser';
import { Expense, PaymentSource, ExpenseCategory, Business } from '@/lib/types';
import { format } from 'date-fns';
import { Plus, Upload, Search, Filter, Trash2, Edit2, X, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

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
    loadExpenses();
    loadPaymentSources();
    loadExpenseCategories();
    loadBusinesses();
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
          // 既存の固定費を削除（元データ以外）
          const existingFixedCosts = await getExpenses();
          const fixedCostId = editingExpense.fixedCostId || editingExpense.id;
          const fixedCostsToDelete = existingFixedCosts.filter(
            exp => (exp.fixedCostId === fixedCostId || exp.id === fixedCostId) && exp.id !== editingExpense.id
          );
          for (const exp of fixedCostsToDelete) {
            if (exp.id) {
              await deleteExpense(exp.id);
            }
          }
        }
        
        await updateExpense(editingExpense.id, expenseData);
        
        // 固定費の場合、全月に展開
        if (isFixedCost) {
          const months = generateMonthOptions();
          const baseExpense = { ...expenseData };
          
          for (const targetMonth of months) {
            if (targetMonth !== month) {
              await addExpense({
                ...baseExpense,
                month: targetMonth,
                date: `${targetMonth}-01`,
                isFixedCost: true,
                fixedCostId: editingExpense.id,
              });
            } else {
              // 元データにもfixedCostIdを設定
              await updateExpense(editingExpense.id, { fixedCostId: editingExpense.id });
            }
          }
        }
      } else {
        // 新規追加
        const addedExpense = await addExpense(expenseData);
        const addedId = addedExpense.id!;
        
        // 固定費の場合、全月に展開
        if (isFixedCost) {
          const months = generateMonthOptions();
          const baseExpense = { ...expenseData };
          
          for (const targetMonth of months) {
            if (targetMonth !== month) {
              await addExpense({
                ...baseExpense,
                month: targetMonth,
                date: `${targetMonth}-01`,
                isFixedCost: true,
                fixedCostId: addedId,
              });
            } else {
              // 元の経費にもfixedCostIdを設定（自分自身を参照）
              await updateExpense(addedId, { fixedCostId: addedId });
            }
          }
        }
      }
      setShowForm(false);
      setEditingExpense(null);
      loadExpenses();
    } catch (error) {
      console.error('経費データの保存に失敗:', error);
      alert('保存に失敗しました');
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
        const fixedCostId = expense?.fixedCostId || id;
        const allExpenses = await getExpenses();
        const fixedCostsToDelete = allExpenses.filter(
          exp => exp.fixedCostId === fixedCostId || exp.id === fixedCostId
        );
        
        for (const exp of fixedCostsToDelete) {
          if (exp.id) {
            await deleteExpense(exp.id);
          }
        }
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

  const filteredExpenses = expenses.filter(expense => 
    expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.business?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">経費管理</h1>
          <p className="text-muted-foreground mt-1">
            日々の経費の記録と管理を行います
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="relative cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            CSV取り込み
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </Button>
          <Button onClick={() => {
            setEditingExpense(null);
            setShowForm(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            新規追加
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>経費一覧</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="検索..."
                  className="pl-9 w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">すべての期間</option>
                  {generateMonthOptions().map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              読み込み中...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <div className="p-3 bg-gray-100 rounded-full">
                <Filter className="h-6 w-6 text-gray-400" />
              </div>
              <p>経費データが見つかりません</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>事業</TableHead>
                    <TableHead>支払元</TableHead>
                    <TableHead>カテゴリ</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>
                            {expense.date instanceof Date 
                              ? format(expense.date, 'yyyy/MM/dd')
                              : expense.date}
                          </span>
                          <span className="text-xs text-muted-foreground">{expense.month}</span>
                        </div>
                      </TableCell>
                      <TableCell>{expense.business || '-'}</TableCell>
                      <TableCell>{expense.paymentSource || '-'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {expense.category || '未分類'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={expense.description}>
                        {expense.description}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        ¥{expense.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {expense.isFixedCost ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            固定費
                          </span>
                        ) : expense.fixedCostId ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                            自動生成
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(expense)}
                            disabled={!!expense.fixedCostId && expense.fixedCostId !== expense.id}
                            title="編集"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(expense.id!)}
                            disabled={!!expense.fixedCostId && expense.fixedCostId !== expense.id}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingExpense ? '経費を編集' : '経費を登録'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">日付 *</label>
                  <div className="relative">
                    <Input
                      type="date"
                      name="date"
                      defaultValue={editingExpense?.date instanceof Date 
                        ? format(editingExpense.date, 'yyyy-MM-dd')
                        : editingExpense?.date || ''}
                      required
                    />
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">金額 *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">¥</span>
                    <Input
                      type="number"
                      name="amount"
                      defaultValue={editingExpense?.amount || ''}
                      required
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">事業</label>
                  <select
                    name="business"
                    defaultValue={editingExpense?.business || ''}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">選択してください</option>
                    {businesses.map(business => (
                      <option key={business.id} value={business.name}>{business.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">支払元</label>
                  <select
                    name="paymentSource"
                    defaultValue={editingExpense?.paymentSource || ''}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">選択してください</option>
                    {paymentSources.map(source => (
                      <option key={source.id} value={source.name}>{source.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">カテゴリ</label>
                  <select
                    name="category"
                    defaultValue={editingExpense?.category || ''}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">選択してください</option>
                    {expenseCategories.map(category => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">内容</label>
                  <Input
                    type="text"
                    name="description"
                    defaultValue={editingExpense?.description || ''}
                    placeholder="例: 交通費、消耗品など"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">メモ</label>
                  <textarea
                    name="memo"
                    defaultValue={editingExpense?.memo || ''}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="補足事項があれば入力してください"
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-start space-x-3 p-4 border rounded-lg bg-gray-50">
                    <input
                      type="checkbox"
                      name="isFixedCost"
                      id="isFixedCost"
                      defaultChecked={editingExpense?.isFixedCost || false}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="space-y-1">
                      <label htmlFor="isFixedCost" className="text-sm font-medium leading-none cursor-pointer">
                        固定費として登録
                      </label>
                      <p className="text-xs text-muted-foreground">
                        チェックを入れると、2025年10月から2026年9月までの全月に自動的にこの経費が反映されます。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit">
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
