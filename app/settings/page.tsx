'use client';

import { useState, useEffect } from 'react';
import { 
  getAllBusinesses, addBusiness, updateBusiness, deleteBusiness, 
  getAllPaymentSources, addPaymentSource, updatePaymentSource, deletePaymentSource, 
  getAllExpenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, 
  getAllModels, addModel, updateModel, deleteModel, 
  getAllRecipients, addRecipient, updateRecipient, deleteRecipient
} from '@/lib/supabase-db';
import { Business, PaymentSource, ExpenseCategory, Model, Recipient } from '@/lib/types';
import { Plus, Edit2, Trash2, X, Building2, CreditCard, Tag, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  
  // Modals state
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  
  const [showPaymentSourceModal, setShowPaymentSourceModal] = useState(false);
  const [editingPaymentSource, setEditingPaymentSource] = useState<PaymentSource | null>(null);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [selectedBusinessForModel, setSelectedBusinessForModel] = useState<string>('');
  
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadBusinesses(),
      loadPaymentSources(),
      loadExpenseCategories(),
      loadModels(),
      loadRecipients(),
    ]);
  };

  const loadBusinesses = async () => {
    const data = await getAllBusinesses();
    setBusinesses(data);
  };
  
  const loadPaymentSources = async () => {
    const data = await getAllPaymentSources();
    setPaymentSources(data);
  };
  
  const loadExpenseCategories = async () => {
    const data = await getAllExpenseCategories();
    setExpenseCategories(data);
    if (data.length === 0) await addDefaultCategories();
  };
  
  const loadModels = async () => {
    const data = await getAllModels();
    setModels(data);
  };
  
  const loadRecipients = async () => {
    const data = await getAllRecipients();
    setRecipients(data);
  };

  const addDefaultCategories = async () => {
    const DEFAULT_CATEGORIES = ['交通費', '通信費', '消耗品費', '広告宣伝費', '接待交際費', '会議費', '水道光熱費', '地代家賃', '雑費'];
    for (const name of DEFAULT_CATEGORIES) {
      await addExpenseCategory({ name, memo: '' });
    }
    const data = await getAllExpenseCategories();
    setExpenseCategories(data);
  };

  // Generic handler for submitting forms
  const handleSubmit = async (
    e: React.FormEvent,
    action: 'business' | 'paymentSource' | 'category' | 'model' | 'recipient',
    data: any,
    editingId?: string
  ) => {
    e.preventDefault();
    try {
      switch (action) {
        case 'business':
          if (editingId) await updateBusiness(editingId, data);
          else await addBusiness(data);
          setShowBusinessModal(false);
          loadBusinesses();
          break;
        case 'paymentSource':
          if (editingId) await updatePaymentSource(editingId, data);
          else await addPaymentSource(data);
          setShowPaymentSourceModal(false);
          loadPaymentSources();
          break;
        case 'category':
          if (editingId) await updateExpenseCategory(editingId, data);
          else await addExpenseCategory(data);
          setShowCategoryModal(false);
          loadExpenseCategories();
          break;
        case 'model':
          if (editingId) await updateModel(editingId, data);
          else await addModel(data);
          setShowModelModal(false);
          loadModels();
          break;
        case 'recipient':
          if (editingId) await updateRecipient(editingId, data);
          else await addRecipient(data);
          setShowRecipientModal(false);
          loadRecipients();
          break;
      }
    } catch (error) {
      console.error('保存に失敗:', error);
      alert('保存に失敗しました');
    }
  };

  // Generic handler for deletion
  const handleDelete = async (
    id: string,
    action: 'business' | 'paymentSource' | 'category' | 'model' | 'recipient'
  ) => {
    if (!confirm('本当に削除しますか？')) return;
    try {
      switch (action) {
        case 'business':
          await deleteBusiness(id);
          loadBusinesses();
          break;
        case 'paymentSource':
          await deletePaymentSource(id);
          loadPaymentSources();
          break;
        case 'category':
          await deleteExpenseCategory(id);
          loadExpenseCategories();
          break;
        case 'model':
          await deleteModel(id);
          loadModels();
          break;
        case 'recipient':
          await deleteRecipient(id);
          loadRecipients();
          break;
      }
    } catch (error) {
      console.error('削除に失敗:', error);
      alert('削除に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">設定</h1>
        <p className="text-muted-foreground mt-1">
          アプリケーションの基本設定を管理します
        </p>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList>
          <TabsTrigger value="business">事業管理</TabsTrigger>
          <TabsTrigger value="payment">支払い・分配</TabsTrigger>
          <TabsTrigger value="category">経費カテゴリー</TabsTrigger>
          <TabsTrigger value="model">モデル/部署</TabsTrigger>
        </TabsList>

        {/* 事業管理 */}
        <TabsContent value="business">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>事業一覧</CardTitle>
                <CardDescription>管理する事業やプロジェクトを登録します</CardDescription>
              </div>
              <Button onClick={() => { setEditingBusiness(null); setShowBusinessModal(true); }}>
                <Plus className="mr-2 h-4 w-4" /> 追加
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {businesses.map((business) => (
                  <div key={business.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: business.color || '#cccccc' }} />
                      <div>
                        <div className="font-medium">{business.name}</div>
                        {business.memo && <div className="text-sm text-muted-foreground">{business.memo}</div>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingBusiness(business); setShowBusinessModal(true); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(business.id!, 'business')} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 支払い・分配管理 */}
        <TabsContent value="payment">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>支払い元</CardTitle>
                  <CardDescription>経費の支払い手段（カード、口座など）</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditingPaymentSource(null); setShowPaymentSourceModal(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> 追加
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {paymentSources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{source.name}</div>
                          {source.memo && <div className="text-sm text-muted-foreground">{source.memo}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingPaymentSource(source); setShowPaymentSourceModal(true); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(source.id!, 'paymentSource')} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>分配先</CardTitle>
                  <CardDescription>利益の分配対象となる人や組織</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditingRecipient(null); setShowRecipientModal(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> 追加
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{recipient.name}</div>
                          {recipient.memo && <div className="text-sm text-muted-foreground">{recipient.memo}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingRecipient(recipient); setShowRecipientModal(true); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(recipient.id!, 'recipient')} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 経費カテゴリー */}
        <TabsContent value="category">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>経費カテゴリー</CardTitle>
                <CardDescription>経費の分類項目を管理します</CardDescription>
              </div>
              <Button onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}>
                <Plus className="mr-2 h-4 w-4" /> 追加
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {expenseCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCategory(category); setShowCategoryModal(true); }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(category.id!, 'category')}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* モデル/部署 */}
        <TabsContent value="model">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>モデル/部署一覧</CardTitle>
                <CardDescription>事業に紐づく詳細なモデルや部署を管理します</CardDescription>
              </div>
              <Button onClick={() => { setEditingModel(null); setSelectedBusinessForModel(''); setShowModelModal(true); }}>
                <Plus className="mr-2 h-4 w-4" /> 追加
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {businesses.map((business) => {
                  const businessModels = models.filter(m => m.businessId === business.id);
                  if (businessModels.length === 0) return null;
                  
                  return (
                    <div key={business.id}>
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {business.name}
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {businessModels.map((model) => (
                          <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 bg-gray-50/50">
                            <span className="font-medium">{model.name}</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingModel(model); setSelectedBusinessForModel(model.businessId); setShowModelModal(true); }}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(model.id!, 'model')}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- Modals --- */}
      
      {/* Business Modal */}
      {showBusinessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingBusiness ? '事業を編集' : '事業を追加'}</h2>
            <form onSubmit={(e) => {
              const formData = new FormData(e.currentTarget);
              handleSubmit(e, 'business', {
                name: formData.get('name'),
                memo: formData.get('memo'),
                color: formData.get('color'),
              }, editingBusiness?.id);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">事業名 *</label>
                  <Input name="name" defaultValue={editingBusiness?.name} required />
                </div>
                <div>
                  <label className="text-sm font-medium">テーマカラー</label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      name="color" 
                      defaultValue={editingBusiness?.color || '#3b82f6'} 
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      name="color_text" 
                      defaultValue={editingBusiness?.color || '#3b82f6'} 
                      className="flex-1"
                      placeholder="#000000"
                      onChange={(e) => {
                        const colorInput = e.currentTarget.form?.querySelector('input[type="color"]') as HTMLInputElement;
                        if (colorInput) colorInput.value = e.target.value;
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">メモ</label>
                  <Input name="memo" defaultValue={editingBusiness?.memo || ''} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowBusinessModal(false)}>キャンセル</Button>
                  <Button type="submit">保存</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Source Modal */}
      {showPaymentSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingPaymentSource ? '支払い元を編集' : '支払い元を追加'}</h2>
            <form onSubmit={(e) => {
              const formData = new FormData(e.currentTarget);
              handleSubmit(e, 'paymentSource', {
                name: formData.get('name'),
                memo: formData.get('memo')
              }, editingPaymentSource?.id);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">支払い元名 *</label>
                  <Input name="name" defaultValue={editingPaymentSource?.name} required />
                </div>
                <div>
                  <label className="text-sm font-medium">メモ</label>
                  <Input name="memo" defaultValue={editingPaymentSource?.memo || ''} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowPaymentSourceModal(false)}>キャンセル</Button>
                  <Button type="submit">保存</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingCategory ? 'カテゴリーを編集' : 'カテゴリーを追加'}</h2>
            <form onSubmit={(e) => {
              const formData = new FormData(e.currentTarget);
              handleSubmit(e, 'category', {
                name: formData.get('name'),
                memo: formData.get('memo')
              }, editingCategory?.id);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">カテゴリー名 *</label>
                  <Input name="name" defaultValue={editingCategory?.name} required />
                </div>
                <div>
                  <label className="text-sm font-medium">メモ</label>
                  <Input name="memo" defaultValue={editingCategory?.memo || ''} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCategoryModal(false)}>キャンセル</Button>
                  <Button type="submit">保存</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipient Modal */}
      {showRecipientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingRecipient ? '分配先を編集' : '分配先を追加'}</h2>
            <form onSubmit={(e) => {
              const formData = new FormData(e.currentTarget);
              handleSubmit(e, 'recipient', {
                name: formData.get('name'),
                memo: formData.get('memo')
              }, editingRecipient?.id);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">分配先名 *</label>
                  <Input name="name" defaultValue={editingRecipient?.name} required />
                </div>
                <div>
                  <label className="text-sm font-medium">メモ</label>
                  <Input name="memo" defaultValue={editingRecipient?.memo || ''} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowRecipientModal(false)}>キャンセル</Button>
                  <Button type="submit">保存</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Model Modal */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingModel ? 'モデルを編集' : 'モデルを追加'}</h2>
            <form onSubmit={(e) => {
              const formData = new FormData(e.currentTarget);
              const businessId = formData.get('businessId') as string;
              const business = businesses.find(b => b.id === businessId);
              
              if (!business) return;

              handleSubmit(e, 'model', {
                businessId,
                businessName: business.name,
                name: formData.get('name'),
                memo: formData.get('memo')
              }, editingModel?.id);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">事業 *</label>
                  <select
                    name="businessId"
                    defaultValue={selectedBusinessForModel}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">選択してください</option>
                    {businesses.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">モデル名 *</label>
                  <Input name="name" defaultValue={editingModel?.name} required />
                </div>
                <div>
                  <label className="text-sm font-medium">メモ</label>
                  <Input name="memo" defaultValue={editingModel?.memo || ''} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModelModal(false)}>キャンセル</Button>
                  <Button type="submit">保存</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
