'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAllBusinesses, addBusiness, updateBusiness, deleteBusiness, getAllPaymentSources, addPaymentSource, updatePaymentSource, deletePaymentSource, getAllExpenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, getAllModels, addModel, updateModel, deleteModel, getModelsByBusinessName, getAllRecipients, addRecipient, updateRecipient, deleteRecipient } from '@/lib/firestore';
import { Business, PaymentSource, ExpenseCategory, Model, Recipient } from '@/lib/types';

export default function SettingsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessMemo, setNewBusinessMemo] = useState('');
  
  const [showPaymentSourceModal, setShowPaymentSourceModal] = useState(false);
  const [editingPaymentSource, setEditingPaymentSource] = useState<PaymentSource | null>(null);
  const [newPaymentSourceName, setNewPaymentSourceName] = useState('');
  const [newPaymentSourceMemo, setNewPaymentSourceMemo] = useState('');
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryMemo, setNewCategoryMemo] = useState('');
  
  const [models, setModels] = useState<Model[]>([]);
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [selectedBusinessForModel, setSelectedBusinessForModel] = useState<string>('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelMemo, setNewModelMemo] = useState('');
  
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientMemo, setNewRecipientMemo] = useState('');
  const [paymentSourceTab, setPaymentSourceTab] = useState<'payment' | 'recipient'>('payment');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadBusinesses(),
      loadPaymentSources(),
      loadExpenseCategories(),
      loadModels(),
      loadRecipients(), // 分配先も読み込む
    ]);
  };

  // ========== 事業管理 ==========
  const loadBusinesses = async () => {
    try {
      const data = await getAllBusinesses();
      setBusinesses(data);
    } catch (error) {
      console.error('事業データの読み込みに失敗:', error);
    }
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBusiness?.id) {
        await updateBusiness(editingBusiness.id, {
          name: newBusinessName,
          memo: newBusinessMemo,
        });
      } else {
        await addBusiness({
          name: newBusinessName,
          memo: newBusinessMemo,
        });
      }
      setNewBusinessName('');
      setNewBusinessMemo('');
      setEditingBusiness(null);
      setShowBusinessModal(false);
      loadBusinesses();
    } catch (error) {
      console.error('事業の保存に失敗:', error);
      alert('保存に失敗しました');
    }
  };

  const handleBusinessDelete = async (id: string) => {
    if (!confirm('この事業を削除しますか？')) return;
    try {
      await deleteBusiness(id);
      loadBusinesses();
    } catch (error) {
      console.error('事業の削除に失敗:', error);
      alert('削除に失敗しました');
    }
  };

  const handleBusinessEdit = (business: Business) => {
    setEditingBusiness(business);
    setNewBusinessName(business.name);
    setNewBusinessMemo(business.memo || '');
    setShowBusinessModal(true);
  };

  const handleOpenBusinessModal = () => {
    setEditingBusiness(null);
    setNewBusinessName('');
    setNewBusinessMemo('');
    setShowBusinessModal(true);
  };

  // ========== 支払い元管理 ==========
  const loadPaymentSources = async () => {
    try {
      const data = await getAllPaymentSources();
      setPaymentSources(data);
    } catch (error) {
      console.error('支払い元データの読み込みに失敗:', error);
    }
  };

  const handlePaymentSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPaymentSource?.id) {
        await updatePaymentSource(editingPaymentSource.id, {
          name: newPaymentSourceName,
          memo: newPaymentSourceMemo,
        });
      } else {
        await addPaymentSource({
          name: newPaymentSourceName,
          memo: newPaymentSourceMemo,
        });
      }
      setNewPaymentSourceName('');
      setNewPaymentSourceMemo('');
      setEditingPaymentSource(null);
      setShowPaymentSourceModal(false);
      loadPaymentSources();
    } catch (error) {
      console.error('支払い元の保存に失敗:', error);
      alert('保存に失敗しました');
    }
  };

  const handlePaymentSourceDelete = async (id: string) => {
    if (!confirm('この支払い元を削除しますか？')) return;
    try {
      await deletePaymentSource(id);
      loadPaymentSources();
    } catch (error) {
      console.error('支払い元の削除に失敗:', error);
      alert('削除に失敗しました');
    }
  };

  const handlePaymentSourceEdit = (paymentSource: PaymentSource) => {
    setEditingPaymentSource(paymentSource);
    setNewPaymentSourceName(paymentSource.name);
    setNewPaymentSourceMemo(paymentSource.memo || '');
    setShowPaymentSourceModal(true);
  };

  const handleOpenPaymentSourceModal = () => {
    setEditingPaymentSource(null);
    setNewPaymentSourceName('');
    setNewPaymentSourceMemo('');
    setShowPaymentSourceModal(true);
  };

  // ========== 経費カテゴリー管理 ==========
  const DEFAULT_EXPENSE_CATEGORIES = [
    '交通費',
    '通信費',
    '消耗品費',
    '広告宣伝費',
    '接待交際費',
    '会議費',
    '旅費交通費',
    '水道光熱費',
    '地代家賃',
    '保険料',
    '修繕費',
    '外注費',
    '支払手数料',
    '雑費',
  ];

  const loadExpenseCategories = async () => {
    try {
      const data = await getAllExpenseCategories();
      setExpenseCategories(data);
      
      // カテゴリーが0件の場合、基本カテゴリーを自動追加
      if (data.length === 0) {
        await addDefaultCategories();
      }
    } catch (error) {
      console.error('経費カテゴリーデータの読み込みに失敗:', error);
    }
  };

  const addDefaultCategories = async () => {
    try {
      for (const categoryName of DEFAULT_EXPENSE_CATEGORIES) {
        await addExpenseCategory({
          name: categoryName,
          memo: '',
        });
      }
      // 追加後に再読み込み
      const data = await getAllExpenseCategories();
      setExpenseCategories(data);
    } catch (error) {
      console.error('基本カテゴリーの追加に失敗:', error);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory?.id) {
        await updateExpenseCategory(editingCategory.id, {
          name: newCategoryName,
          memo: newCategoryMemo,
        });
      } else {
        await addExpenseCategory({
          name: newCategoryName,
          memo: newCategoryMemo,
        });
      }
      setNewCategoryName('');
      setNewCategoryMemo('');
      setEditingCategory(null);
      setShowCategoryModal(false);
      loadExpenseCategories();
    } catch (error) {
      console.error('経費カテゴリーの保存に失敗:', error);
      alert('保存に失敗しました');
    }
  };

  const handleCategoryDelete = async (id: string) => {
    if (!confirm('この経費カテゴリーを削除しますか？')) return;
    try {
      await deleteExpenseCategory(id);
      loadExpenseCategories();
    } catch (error) {
      console.error('経費カテゴリーの削除に失敗:', error);
      alert('削除に失敗しました');
    }
  };

  const handleCategoryEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryMemo(category.memo || '');
    setShowCategoryModal(true);
  };

  const handleOpenCategoryModal = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryMemo('');
    setShowCategoryModal(true);
  };

  // ========== モデル管理 ==========
  const loadModels = async () => {
    try {
      const data = await getAllModels();
      setModels(data);
    } catch (error) {
      console.error('モデルデータの読み込みに失敗:', error);
    }
  };

  const handleModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessForModel) {
      alert('事業を選択してください');
      return;
    }
    try {
      const selectedBusiness = businesses.find(b => b.id === selectedBusinessForModel);
      if (!selectedBusiness) {
        alert('事業が見つかりません');
        return;
      }
      
      if (editingModel?.id) {
        await updateModel(editingModel.id, {
          businessId: selectedBusinessForModel,
          businessName: selectedBusiness.name,
          name: newModelName,
          memo: newModelMemo,
        });
      } else {
        await addModel({
          businessId: selectedBusinessForModel,
          businessName: selectedBusiness.name,
          name: newModelName,
          memo: newModelMemo,
        });
      }
      setSelectedBusinessForModel('');
      setNewModelName('');
      setNewModelMemo('');
      setEditingModel(null);
      setShowModelModal(false);
      loadModels();
    } catch (error) {
      console.error('モデルの保存に失敗:', error);
      alert('保存に失敗しました');
    }
  };

  const handleModelDelete = async (id: string) => {
    if (!confirm('このモデルを削除しますか？')) return;
    try {
      await deleteModel(id);
      loadModels();
    } catch (error) {
      console.error('モデルの削除に失敗:', error);
      alert('削除に失敗しました');
    }
  };

  const handleModelEdit = (model: Model) => {
    setEditingModel(model);
    setSelectedBusinessForModel(model.businessId);
    setNewModelName(model.name);
    setNewModelMemo(model.memo || '');
    setShowModelModal(true);
  };

  const handleOpenModelModal = () => {
    setEditingModel(null);
    setSelectedBusinessForModel('');
    setNewModelName('');
    setNewModelMemo('');
    setShowModelModal(true);
  };

  // ========== 分配先管理 ==========
  const loadRecipients = async () => {
    try {
      const data = await getAllRecipients();
      setRecipients(data);
    } catch (error) {
      console.error('分配先データの読み込みに失敗:', error);
    }
  };

  const handleRecipientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRecipient?.id) {
        await updateRecipient(editingRecipient.id, {
          name: newRecipientName,
          memo: newRecipientMemo,
        });
      } else {
        await addRecipient({
          name: newRecipientName,
          memo: newRecipientMemo,
        });
      }
      setNewRecipientName('');
      setNewRecipientMemo('');
      setEditingRecipient(null);
      setShowRecipientModal(false);
      loadRecipients();
    } catch (error) {
      console.error('分配先の保存に失敗:', error);
      alert('保存に失敗しました');
    }
  };

  const handleRecipientDelete = async (id: string) => {
    if (!confirm('この分配先を削除しますか？')) return;
    try {
      await deleteRecipient(id);
      loadRecipients();
    } catch (error) {
      console.error('分配先の削除に失敗:', error);
      alert('削除に失敗しました');
    }
  };

  const handleRecipientEdit = (recipient: Recipient) => {
    setEditingRecipient(recipient);
    setNewRecipientName(recipient.name);
    setNewRecipientMemo(recipient.memo || '');
    setShowRecipientModal(true);
  };

  const handleOpenRecipientModal = () => {
    setEditingRecipient(null);
    setNewRecipientName('');
    setNewRecipientMemo('');
    setShowRecipientModal(true);
  };

  // ========== データクリーンアップ ==========
  const handleCleanupData = async () => {
    if (!confirm('登録されていない事業のデータを削除します。よろしいですか？\n\n※この操作は取り消せません')) {
      return;
    }
    
    try {
      const validBusinessNames = new Set(businesses.map(b => b.name));
      let deletedProfitEntries = 0;
      let deletedExpenses = 0;
      let deletedDistributions = 0;
      
      // 1. profitsコレクションのクリーンアップ
      const profitSnapshot = await getDocs(query(collection(db!, 'profits')));
      for (const docSnap of profitSnapshot.docs) {
        const data = docSnap.data();
        const revenues = data.revenues || {};
        const cleanedRevenues: Record<string, number> = {};
        
        // 登録されている事業のみ残す
        Object.entries(revenues).forEach(([biz, rev]) => {
          if (validBusinessNames.has(biz)) {
            cleanedRevenues[biz] = rev as number;
          } else {
            deletedProfitEntries++;
          }
        });
        
        // 更新
        if (Object.keys(cleanedRevenues).length !== Object.keys(revenues).length) {
          const totalRevenue = Object.values(cleanedRevenues).reduce((s, v) => s + v, 0);
          await updateDoc(doc(db!, 'profits', docSnap.id), {
            revenues: cleanedRevenues,
            totalRevenue,
            grossProfit: totalRevenue,
            netProfit: totalRevenue - (data.totalExpense || 0),
          });
        }
      }
      
      // 2. expensesコレクションのクリーンアップ
      const expenseSnapshot = await getDocs(query(collection(db!, 'expenses')));
      for (const docSnap of expenseSnapshot.docs) {
        const data = docSnap.data();
        if (data.business && !validBusinessNames.has(data.business)) {
          await deleteDoc(doc(db!, 'expenses', docSnap.id));
          deletedExpenses++;
        }
      }
      
      // 3. revenueDistributionsコレクションのクリーンアップ
      const distSnapshot = await getDocs(query(collection(db!, 'revenueDistributions')));
      for (const docSnap of distSnapshot.docs) {
        const data = docSnap.data();
        if (data.businessName && !validBusinessNames.has(data.businessName)) {
          await deleteDoc(doc(db!, 'revenueDistributions', docSnap.id));
          deletedDistributions++;
        }
      }
      
      alert(`クリーンアップ完了!\n\n削除した売上データ: ${deletedProfitEntries}件\n削除した経費: ${deletedExpenses}件\n削除した分配設定: ${deletedDistributions}件`);
      
    } catch (error) {
      console.error('クリーンアップに失敗:', error);
      alert('クリーンアップに失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">設定</h1>
          <Link href="/" className="text-blue-600 hover:underline">← ホームに戻る</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* 事業管理 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">事業管理</h2>
              <button
                onClick={handleOpenBusinessModal}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                追加
              </button>
            </div>
            {businesses.length === 0 ? (
              <p className="text-gray-500 text-sm">事業が登録されていません</p>
            ) : (
              <ul className="space-y-2">
                {businesses.map((business) => (
                  <li key={business.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span className="text-gray-900">{business.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBusinessEdit(business)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleBusinessDelete(business.id!)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        削除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 支払い元・分配先管理 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">支払い元・分配先管理</h2>
              <button
                onClick={() => {
                  if (paymentSourceTab === 'payment') {
                    handleOpenPaymentSourceModal();
                  } else {
                    handleOpenRecipientModal();
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                追加
              </button>
            </div>
            
            {/* タブ */}
            <div className="flex gap-2 mb-4 border-b">
              <button
                onClick={() => setPaymentSourceTab('payment')}
                className={`px-4 py-2 text-sm font-medium ${
                  paymentSourceTab === 'payment'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                支払い元
              </button>
              <button
                onClick={() => setPaymentSourceTab('recipient')}
                className={`px-4 py-2 text-sm font-medium ${
                  paymentSourceTab === 'recipient'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                分配先
              </button>
            </div>
            
            {/* 支払い元タブ */}
            {paymentSourceTab === 'payment' && (
              <>
                {paymentSources.length === 0 ? (
                  <p className="text-gray-500 text-sm">支払い元が登録されていません</p>
                ) : (
                  <ul className="space-y-2">
                    {paymentSources.map((source) => (
                      <li key={source.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <span className="text-gray-900">{source.name}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePaymentSourceEdit(source)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handlePaymentSourceDelete(source.id!)}
                            className="text-red-600 hover:underline text-sm"
                          >
                            削除
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            
            {/* 分配先タブ */}
            {paymentSourceTab === 'recipient' && (
              <>
                {recipients.length === 0 ? (
                  <p className="text-gray-500 text-sm">分配先が登録されていません</p>
                ) : (
                  <ul className="space-y-2">
                    {recipients.map((recipient) => (
                      <li key={recipient.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <span className="text-gray-900">{recipient.name}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRecipientEdit(recipient)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleRecipientDelete(recipient.id!)}
                            className="text-red-600 hover:underline text-sm"
                          >
                            削除
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* 経費カテゴリー管理 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">経費カテゴリー管理</h2>
              <button
                onClick={handleOpenCategoryModal}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                追加
              </button>
            </div>
            {expenseCategories.length === 0 ? (
              <p className="text-gray-500 text-sm">経費カテゴリーが登録されていません</p>
            ) : (
              <ul className="space-y-2">
                {expenseCategories.map((category) => (
                  <li key={category.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span className="text-gray-900">{category.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCategoryEdit(category)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleCategoryDelete(category.id!)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        削除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* モデル管理 */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">モデル/部署管理</h2>
            <button
              onClick={handleOpenModelModal}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
            >
              追加
            </button>
          </div>
          {businesses.length === 0 ? (
            <p className="text-gray-500 text-sm">まず事業を登録してください</p>
          ) : models.length === 0 ? (
            <p className="text-gray-500 text-sm">モデルが登録されていません</p>
          ) : (
            <div className="space-y-4">
              {businesses.map((business) => {
                const businessModels = models.filter(m => m.businessId === business.id);
                if (businessModels.length === 0) return null;
                
                return (
                  <div key={business.id} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{business.name}</h3>
                    <ul className="space-y-2">
                      {businessModels.map((model) => (
                        <li key={model.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <span className="text-gray-900">{model.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleModelEdit(model)}
                              className="text-blue-600 hover:underline text-sm"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleModelDelete(model.id!)}
                              className="text-red-600 hover:underline text-sm"
                            >
                              削除
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 事業管理モーダル */}
        {showBusinessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingBusiness ? '事業を編集' : '事業を追加'}
                </h2>
                <button
                  onClick={() => {
                    setShowBusinessModal(false);
                    setEditingBusiness(null);
                    setNewBusinessName('');
                    setNewBusinessMemo('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleBusinessSubmit}>
                <div className="mb-4">
                  <label className="block mb-1 text-gray-900">事業名 *</label>
                  <input
                    type="text"
                    value={newBusinessName}
                    onChange={(e) => setNewBusinessName(e.target.value)}
                    required
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                    placeholder="例: MyFans, 非属人人, ココナラ"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-gray-900">メモ</label>
                  <textarea
                    value={newBusinessMemo}
                    onChange={(e) => setNewBusinessMemo(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                    rows={3}
                    placeholder="メモ（任意）"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {editingBusiness ? '更新' : '追加'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBusinessModal(false);
                      setEditingBusiness(null);
                      setNewBusinessName('');
                      setNewBusinessMemo('');
                    }}
                    className="bg-gray-300 text-gray-900 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 支払い元管理モーダル */}
        {showPaymentSourceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPaymentSource ? '支払い元を編集' : '支払い元を追加'}
                </h2>
                <button
                  onClick={() => {
                    setShowPaymentSourceModal(false);
                    setEditingPaymentSource(null);
                    setNewPaymentSourceName('');
                    setNewPaymentSourceMemo('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handlePaymentSourceSubmit}>
                <div className="mb-4">
                  <label className="block mb-1 text-gray-900">支払い元名 *</label>
                  <input
                    type="text"
                    value={newPaymentSourceName}
                    onChange={(e) => setNewPaymentSourceName(e.target.value)}
                    required
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                    placeholder="例: AMEX, Visa, 銀行口座"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-gray-900">メモ</label>
                  <textarea
                    value={newPaymentSourceMemo}
                    onChange={(e) => setNewPaymentSourceMemo(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                    rows={3}
                    placeholder="メモ（任意）"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {editingPaymentSource ? '更新' : '追加'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentSourceModal(false);
                      setEditingPaymentSource(null);
                      setNewPaymentSourceName('');
                      setNewPaymentSourceMemo('');
                    }}
                    className="bg-gray-300 text-gray-900 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 経費カテゴリー管理モーダル */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCategory ? '経費カテゴリーを編集' : '経費カテゴリーを追加'}
                </h2>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setNewCategoryName('');
                    setNewCategoryMemo('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCategorySubmit}>
                <div className="mb-4">
                  <label className="block mb-1 text-gray-900">カテゴリー名 *</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                    placeholder="例: 交通費, 通信費, 事務用品"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-gray-900">メモ</label>
                  <textarea
                    value={newCategoryMemo}
                    onChange={(e) => setNewCategoryMemo(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                    rows={3}
                    placeholder="メモ（任意）"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {editingCategory ? '更新' : '追加'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryModal(false);
                      setEditingCategory(null);
                      setNewCategoryName('');
                      setNewCategoryMemo('');
                    }}
                    className="bg-gray-300 text-gray-900 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* モデル管理モーダル */}
        {showModelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingModel ? 'モデルを編集' : 'モデルを追加'}
                </h2>
                <button
                  onClick={() => {
                    setShowModelModal(false);
                    setEditingModel(null);
                    setSelectedBusinessForModel('');
                    setNewModelName('');
                    setNewModelMemo('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleModelSubmit}>
                <div className="mb-4">
                  <label className="block mb-1 text-gray-900">事業 *</label>
                  <select
                    value={selectedBusinessForModel}
                    onChange={(e) => setSelectedBusinessForModel(e.target.value)}
                    required
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                  >
                    <option value="">選択してください</option>
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-gray-900">モデル名 *</label>
                  <input
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    required
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                    placeholder="例: モデルA, モデルB"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-gray-900">メモ</label>
                  <textarea
                    value={newModelMemo}
                    onChange={(e) => setNewModelMemo(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                    rows={3}
                    placeholder="メモ（任意）"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {editingModel ? '更新' : '追加'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModelModal(false);
                      setEditingModel(null);
                      setSelectedBusinessForModel('');
                      setNewModelName('');
                      setNewModelMemo('');
                    }}
                    className="bg-gray-300 text-gray-900 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 分配先管理モーダル */}
        {showRecipientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingRecipient ? '分配先を編集' : '分配先を追加'}
                </h2>
                <button
                  onClick={() => {
                    setShowRecipientModal(false);
                    setEditingRecipient(null);
                    setNewRecipientName('');
                    setNewRecipientMemo('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleRecipientSubmit}>
                <div className="mb-4">
                  <label className="block mb-1 text-gray-900">分配先名 *</label>
                  <input
                    type="text"
                    value={newRecipientName}
                    onChange={(e) => setNewRecipientName(e.target.value)}
                    required
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                    placeholder="例: パートナーA, 投資家B, 自分"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1 text-gray-900">メモ</label>
                  <textarea
                    value={newRecipientMemo}
                    onChange={(e) => setNewRecipientMemo(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                    rows={3}
                    placeholder="メモ（任意）"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {editingRecipient ? '更新' : '追加'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecipientModal(false);
                      setEditingRecipient(null);
                      setNewRecipientName('');
                      setNewRecipientMemo('');
                    }}
                    className="bg-gray-300 text-gray-900 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* データクリーンアップ */}
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">データクリーンアップ</h2>
          <p className="text-gray-600 text-sm mb-4">
            登録されていない事業に関連するデータ（売上、経費、分配設定）を削除します。
          </p>
          <button
            onClick={handleCleanupData}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            不要なデータを削除
          </button>
        </div>
      </div>
    </div>
  );
}

