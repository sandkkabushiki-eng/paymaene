'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getExpenses, addExpense, updateExpense, deleteExpense, getAllPaymentSources, getAllExpenseCategories, getAllBusinesses } from '@/lib/firestore';
import { importCsvFile } from '@/lib/csvParser';
import { Expense, PaymentSource, ExpenseCategory, Business } from '@/lib/types';
import { format } from 'date-fns';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

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
      const errorMessage = error?.message || 'データの読み込みに失敗しました';
      alert(`データの読み込みに失敗しました: ${errorMessage}`);
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
    };

    try {
      if (editingExpense?.id) {
        await updateExpense(editingExpense.id, expenseData);
      } else {
        await addExpense(expenseData);
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
    if (!confirm('この経費を削除しますか？')) return;
    
    try {
      await deleteExpense(id);
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


  // 月の選択肢を生成（2025-10から2026-09まで）
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">経費管理</h1>
          <Link href="/" className="text-blue-600 hover:underline">← ホームに戻る</Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2">
              <span className="text-gray-900">月で絞り込み:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded px-3 py-1 text-gray-900 bg-white"
              >
                <option value="">すべて</option>
                {generateMonthOptions().map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer border rounded px-4 py-2 hover:bg-gray-50">
              <span className="text-gray-900">CSV取り込み</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvImport}
                className="hidden"
              />
            </label>
            
            <button
              onClick={() => {
                setEditingExpense(null);
                setShowForm(!showForm);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {showForm ? 'キャンセル' : '新規追加'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="border-t pt-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-gray-900">日付 *</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingExpense?.date instanceof Date 
                      ? format(editingExpense.date, 'yyyy-MM-dd')
                      : editingExpense?.date || ''}
                    required
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white cursor-pointer"
                    onClick={(e) => {
                      // カレンダーを表示
                      (e.target as HTMLInputElement).showPicker?.();
                    }}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-gray-900">事業</label>
                  <select
                    name="business"
                    defaultValue={editingExpense?.business || ''}
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                  >
                    <option value="">選択してください</option>
                    {businesses.map(business => (
                      <option key={business.id} value={business.name}>{business.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-gray-900">支払元</label>
                  <select
                    name="paymentSource"
                    defaultValue={editingExpense?.paymentSource || ''}
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                  >
                    <option value="">選択してください</option>
                    {paymentSources.map(source => (
                      <option key={source.id} value={source.name}>{source.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-gray-900">経費カテゴリ</label>
                  <select
                    name="category"
                    defaultValue={editingExpense?.category || ''}
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                  >
                    <option value="">選択してください</option>
                    {expenseCategories.map(category => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-gray-900">金額 *</label>
                  <input
                    type="number"
                    name="amount"
                    defaultValue={editingExpense?.amount || ''}
                    required
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 text-gray-900">内容</label>
                  <input
                    type="text"
                    name="description"
                    defaultValue={editingExpense?.description || ''}
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 text-gray-900">メモ</label>
                  <textarea
                    name="memo"
                    defaultValue={editingExpense?.memo || ''}
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                    rows={2}
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  {editingExpense ? '更新' : '追加'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">経費一覧</h2>
          {loading ? (
            <p className="text-gray-500">読み込み中...</p>
          ) : expenses.length === 0 ? (
            <p className="text-gray-500">経費データがありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2 text-gray-900">日付</th>
                    <th className="text-left p-2 text-gray-900">月</th>
                    <th className="text-left p-2 text-gray-900">事業</th>
                    <th className="text-left p-2 text-gray-900">支払元</th>
                    <th className="text-left p-2 text-gray-900">カテゴリ</th>
                    <th className="text-left p-2 text-gray-900">内容</th>
                    <th className="text-right p-2 text-gray-900">金額</th>
                    <th className="text-left p-2 text-gray-900">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-gray-900">
                        {expense.date instanceof Date 
                          ? format(expense.date, 'yyyy/MM/dd')
                          : expense.date}
                      </td>
                      <td className="p-2 text-gray-900">{expense.month}</td>
                      <td className="p-2 text-gray-900">{expense.business || '-'}</td>
                      <td className="p-2 text-gray-900">{expense.paymentSource || '-'}</td>
                      <td className="p-2 text-gray-900">{expense.category || '-'}</td>
                      <td className="p-2 text-gray-900">{expense.description}</td>
                      <td className="p-2 text-right text-gray-900">
                        ¥{expense.amount.toLocaleString()}
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-blue-600 hover:underline mr-2"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id!)}
                          className="text-red-600 hover:underline"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

