'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAllProfits, getProfit, updateProfit, addProfit, deleteProfit, calculateProfitForMonth, calculateProfitsForMonths, getAllBusinesses, getExpenses, getTotalExpenseByMonth } from '@/lib/firestore';
import { Profit, Business } from '@/lib/types';

export default function ProfitsPage() {
  const [profits, setProfits] = useState<Profit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfit, setEditingProfit] = useState<Profit | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expandedBusiness, setExpandedBusiness] = useState<string | null>(null);
  // 入力中の値を管理（保存前の一時的な値、nullは空文字列を意味する）
  const [editingValues, setEditingValues] = useState<Record<string, Record<string, number | null>>>({});
  // 税率（デフォルト20%）
  const [taxRate, setTaxRate] = useState<number>(20);

  useEffect(() => {
    loadBusinesses();
    loadProfits();
    loadExpenses();
  }, []);

  // ページがフォーカスされたときにデータを再読み込み（保存した値が反映されるように）
  useEffect(() => {
    const handleFocus = () => {
      // ページがフォーカスされたときにデータを再読み込み
      loadProfits();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadProfits = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Firestoreから直接全データを取得
      const q = query(collection(db!, 'profits'));
      const querySnapshot = await getDocs(q);
      
      const allProfits: Profit[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          month: data.month,
          revenues: data.revenues || {},
          totalRevenue: data.totalRevenue || 0,
          totalExpense: data.totalExpense || 0,
          grossProfit: data.grossProfit || 0,
          netProfit: data.netProfit || 0,
        };
      });
      
      console.log('=== Firestore から読み込んだデータ ===');
      allProfits.forEach(p => {
        console.log(`${p.month}:`, p.revenues);
      });
      
      setProfits(allProfits);
    } catch (error: any) {
      console.error('利益データの読み込みに失敗:', error);
      const errorMessage = error?.message || 'データの読み込みに失敗しました';
      alert(`データの読み込みに失敗しました: ${errorMessage}`);
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

  // 事業ごとの経費合計を計算
  const getBusinessExpenseByMonth = (businessName: string, month: string): number => {
    return expenses
      .filter(expense => expense.business === businessName && expense.month === month)
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  // 事業ごとの売上合計を計算（表示用、入力中の値も考慮）
  const getBusinessRevenueByMonth = (businessName: string, month: string): number => {
    // 入力中の値がある場合はそれを優先
    const editingValue = editingValues[month]?.[businessName];
    if (editingValue !== undefined && editingValue !== null) {
      return Number(editingValue);
    }
    
    // 保存済みの値を返す
    const profit = profits.find(p => p.month === month);
    return profit?.revenues?.[businessName] || 0;
  };

  // 事業ごとの純利益を計算
  const getBusinessNetProfitByMonth = (businessName: string, month: string): number => {
    const revenue = getBusinessRevenueByMonth(businessName, month);
    const expense = getBusinessExpenseByMonth(businessName, month);
    return revenue - expense;
  };

  const generateMonths = (): string[] => {
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

  const handleRevenueChange = (month: string, businessName: string, value: string) => {
    // 入力中の値を一時的に保存
    // 空文字列の場合はnull、数値の場合は数値として保存
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
    // 入力中の値があればそれを表示、なければ保存済みの値を表示
    const editingValue = editingValues[month]?.[businessName];
    
    // 入力中の値がある場合（undefinedでない場合）
    if (editingValue !== undefined) {
      if (editingValue === null) {
        return ''; // 空文字列を意味する
      }
      // 0も表示する
      return String(editingValue);
    }
    
    // 保存済みの値を表示
    const profit = profits.find(p => p.month === month);
    if (!profit) {
      return '';
    }
    
    const savedValue = profit.revenues?.[businessName];
    
    // undefined、nullの場合は空文字列を返す（0は表示する）
    if (savedValue === undefined || savedValue === null) {
      return '';
    }
    
    // 0も含めて表示
    return String(savedValue);
  };

  const handleSaveRevenue = async (month: string, businessName: string) => {
    // 保存ボタンが押されたときに保存
    try {
      const inputValue = editingValues[month]?.[businessName];
      console.log('=== 保存開始 ===');
      console.log('month:', month, 'businessName:', businessName, 'inputValue:', inputValue);
      
      // 入力値がnullまたはundefinedの場合はスキップ
      if (inputValue === null || inputValue === undefined) {
        console.log('入力値がnull/undefinedのため、保存をスキップ');
        return;
      }
      
      const value = Number(inputValue);
      if (isNaN(value) || value < 0) {
        alert('0以上の有効な数値を入力してください');
        return;
      }
      
      // 既存データを検索（複数ある場合は全て取得して削除）
      const q = query(collection(db!, 'profits'), where('month', '==', month));
      const querySnapshot = await getDocs(q);
      
      console.log('検索結果:', querySnapshot.docs.length, '件');
      
      // 既存のrevenuesを取得
      let existingRevenues: Record<string, number> = {};
      let existingDocId: string | null = null;
      
      if (!querySnapshot.empty) {
        // 複数ドキュメントがある場合は最初の1つを使用し、残りは削除
        for (let i = 0; i < querySnapshot.docs.length; i++) {
          const docSnap = querySnapshot.docs[i];
          if (i === 0) {
            existingDocId = docSnap.id;
            existingRevenues = docSnap.data().revenues || {};
            console.log('既存ドキュメント使用:', existingDocId, existingRevenues);
          } else {
            // 重複ドキュメントを削除
            console.log('重複ドキュメント削除:', docSnap.id);
            await deleteDoc(doc(db!, 'profits', docSnap.id));
          }
        }
      }
      
      // 新しいrevenuesを設定
      const updatedRevenues = { ...existingRevenues, [businessName]: value };
      console.log('更新後のrevenues:', updatedRevenues);
      
      // 経費合計を計算
      const totalExpense = expenses
        .filter(expense => expense.month === month)
        .reduce((sum, expense) => sum + expense.amount, 0);
      
      // 売上合計を計算
      const totalRevenue = Object.values(updatedRevenues).reduce((sum, rev) => sum + (rev || 0), 0);
      
      const profitData = {
        month,
        revenues: updatedRevenues,
        totalRevenue,
        totalExpense,
        grossProfit: totalRevenue,
        netProfit: totalRevenue - totalExpense,
        updatedAt: new Date(),
      };
      
      console.log('保存するデータ:', profitData);
      
      if (existingDocId) {
        // 既存データを更新
        console.log('既存データを更新:', existingDocId);
        await updateDoc(doc(db!, 'profits', existingDocId), profitData);
      } else {
        // 新規作成
        console.log('新規データを作成');
        await addDoc(collection(db!, 'profits'), {
          ...profitData,
          createdAt: new Date(),
        });
      }
      
      console.log('=== 保存完了 ===');
      
      // 入力中の値をクリア
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
      
      // Firestoreからデータを再読み込み
      await loadProfits();
    } catch (error: any) {
      console.error('売上データの更新に失敗:', error);
      const errorMessage = error?.message || '更新に失敗しました';
      alert(`更新に失敗しました: ${errorMessage}`);
    }
  };

  const handleDeleteProfit = async (month: string) => {
    // 利益データを削除
    if (!confirm(`${month}の利益データを削除しますか？`)) {
      return;
    }
    
    try {
      // Firestoreから直接削除（重複も含めて全て削除）
      const q = query(collection(db!, 'profits'), where('month', '==', month));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert('削除するデータが見つかりませんでした');
        return;
      }
      
      console.log(`${month}: ${querySnapshot.docs.length}件のドキュメントを削除`);
      
      for (const docSnap of querySnapshot.docs) {
        console.log(`削除: ${docSnap.id}`);
        await deleteDoc(doc(db!, 'profits', docSnap.id));
      }
      
      // ステートからも削除
      setProfits(prevProfits => prevProfits.filter(p => p.month !== month));
      alert(`${month}のデータを削除しました`);
      
      // データを再読み込み
      await loadProfits();
    } catch (error) {
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
      alert('すべての月の利益を再計算しました');
    } catch (error) {
      console.error('再計算に失敗:', error);
      alert('再計算に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">利益管理</h1>
          <div className="flex gap-4">
            <button
              onClick={recalculateAll}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              再計算
            </button>
            <Link href="/" className="text-blue-600 hover:underline">← ホームに戻る</Link>
          </div>
        </div>

        {/* 税率設定 */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex items-center gap-4">
          <label className="text-gray-900 font-medium">税率:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              className="w-20 text-right border rounded px-2 py-1 text-gray-900 bg-white"
              min={0}
              max={100}
            />
            <span className="text-gray-600">%</span>
          </div>
          <span className="text-sm text-gray-500">（粗利に対する税金の割合）</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          {loading ? (
            <p className="text-gray-500">読み込み中...</p>
          ) : businesses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">事業が登録されていません</p>
              <Link href="/settings" className="text-blue-600 hover:underline">
                設定ページで事業を追加してください
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {businesses.map((business) => {
                const isExpanded = expandedBusiness === business.name;
                const months = generateMonths();
                
                // 事業ごとの合計を計算
                const totalRevenue = months.reduce((sum, month) => 
                  sum + getBusinessRevenueByMonth(business.name, month), 0
                );
                const totalExpense = months.reduce((sum, month) => 
                  sum + getBusinessExpenseByMonth(business.name, month), 0
                );
                const totalGrossProfit = totalRevenue - totalExpense; // 粗利
                const totalTax = totalGrossProfit > 0 ? Math.floor(totalGrossProfit * taxRate / 100) : 0; // 税金
                const totalNetProfit = totalGrossProfit - totalTax; // 純利益
                
                return (
                  <div key={business.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedBusiness(isExpanded ? null : business.name)}
                      className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition text-left"
                    >
                      <h3 className="text-lg font-semibold text-gray-900">{business.name}</h3>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">粗利</div>
                          <div className={`text-sm font-semibold ${
                            totalGrossProfit >= 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            ¥{totalGrossProfit.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">税金({taxRate}%)</div>
                          <div className="text-sm font-semibold text-orange-600">
                            ¥{totalTax.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">純利益</div>
                          <div className={`text-lg font-bold ${
                            totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ¥{totalNetProfit.toLocaleString()}
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-600 transition-transform ${
                            isExpanded ? 'transform rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 border-t">
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left p-3 text-gray-900">月</th>
                                <th className="text-right p-3 text-gray-900">売上</th>
                                <th className="text-right p-3 text-gray-900">経費</th>
                                <th className="text-right p-3 text-blue-600">粗利</th>
                                <th className="text-right p-3 text-orange-600">税金</th>
                                <th className="text-right p-3 font-bold text-green-600">純利益</th>
                                <th className="text-center p-3 text-gray-900">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {months.map((month) => {
                                const displayValue = getDisplayValue(month, business.name);
                                const savedRevenue = getBusinessRevenueByMonth(business.name, month);
                                const expense = getBusinessExpenseByMonth(business.name, month);
                                // 表示用の値（入力中なら入力値、そうでなければ保存済み値）
                                const inputValue = editingValues[month]?.[business.name];
                                const currentRevenue = inputValue !== undefined && inputValue !== null
                                  ? Number(inputValue)
                                  : savedRevenue;
                                const grossProfit = currentRevenue - expense; // 粗利
                                const tax = grossProfit > 0 ? Math.floor(grossProfit * taxRate / 100) : 0; // 税金
                                const netProfit = grossProfit - tax; // 純利益
                                const hasUnsavedChanges = inputValue !== undefined;
                                
                                return (
                                  <tr key={month} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-semibold text-gray-900">{month}</td>
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          value={displayValue}
                                          onChange={(e) => handleRevenueChange(month, business.name, e.target.value)}
                                          onFocus={(e) => {
                                            // フォーカス時に0や空の場合は空文字列にする
                                            if (e.target.value === '0' || e.target.value === '') {
                                              e.target.select();
                                            }
                                          }}
                                          className="w-full text-right border rounded px-2 py-1 text-gray-900 bg-white"
                                          placeholder="0"
                                        />
                                        {hasUnsavedChanges && (
                                          <button
                                            onClick={() => {
                                              if (confirm(`${month}の売上を保存しますか？`)) {
                                                handleSaveRevenue(month, business.name);
                                              }
                                            }}
                                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 whitespace-nowrap"
                                            title="保存"
                                          >
                                            保存
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3 text-right text-gray-900">
                                      ¥{expense.toLocaleString()}
                                    </td>
                                    <td className={`p-3 text-right ${
                                      grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'
                                    }`}>
                                      ¥{grossProfit.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right text-orange-600">
                                      ¥{tax.toLocaleString()}
                                    </td>
                                    <td className={`p-3 text-right font-bold ${
                                      netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      ¥{netProfit.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        {hasUnsavedChanges && (
                                          <span className="text-xs text-orange-600">未保存</span>
                                        )}
                                        <button
                                          onClick={() => handleDeleteProfit(month)}
                                          className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                                          title="データを削除"
                                        >
                                          削除
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="border-t-2 bg-gray-50 font-semibold">
                                <td className="p-3 text-gray-900">合計</td>
                                <td className="p-3 text-right text-gray-900">
                                  ¥{totalRevenue.toLocaleString()}
                                </td>
                                <td className="p-3 text-right text-gray-900">
                                  ¥{totalExpense.toLocaleString()}
                                </td>
                                <td className={`p-3 text-right ${
                                  totalGrossProfit >= 0 ? 'text-blue-600' : 'text-red-600'
                                }`}>
                                  ¥{totalGrossProfit.toLocaleString()}
                                </td>
                                <td className="p-3 text-right text-orange-600">
                                  ¥{totalTax.toLocaleString()}
                                </td>
                                <td className={`p-3 text-right font-bold ${
                                  totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  ¥{totalNetProfit.toLocaleString()}
                                </td>
                                <td className="p-3"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

