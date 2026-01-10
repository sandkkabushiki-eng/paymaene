'use client';

import { useState, useEffect } from 'react';
import { 
  getAllBusinesses, addBusiness, updateBusiness, deleteBusiness, 
  getAllPaymentSources, addPaymentSource, updatePaymentSource, deletePaymentSource, 
  getAllExpenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, 
  getAllModels, addModel, updateModel, deleteModel, 
  getAllRecipients, addRecipient, updateRecipient, deleteRecipient,
  getAllCategories, addCategory, updateCategory, deleteCategory
} from '@/lib/supabase-db';
import { Business, PaymentSource, ExpenseCategory, Model, Recipient, Category } from '@/lib/types';
import { Plus, Edit2, Trash2, X, Building2, CreditCard, Tag, Users, Folder } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingOverlay } from '@/components/ui/loading';

export default function SettingsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  
  const [showCategoryGroupModal, setShowCategoryGroupModal] = useState(false);
  const [editingCategoryGroup, setEditingCategoryGroup] = useState<Category | null>(null);
  
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
    setLoading(true);
    try {
      await Promise.all([
        loadBusinesses(),
        loadCategories(),
        loadPaymentSources(),
        loadExpenseCategories(),
        loadModels(),
        loadRecipients(),
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  const loadCategories = async () => {
    try {
      const data = await getAllCategories();
      setCategories(data);
    } catch (error: any) {
      // エラーログはgetAllCategories内で出力されるため、ここでは空配列を設定するだけ
      setCategories([]);
    }
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
    // 並列で追加（N+1解消）
    await Promise.all(DEFAULT_CATEGORIES.map(name => addExpenseCategory({ name, memo: '' })));
    const data = await getAllExpenseCategories();
    setExpenseCategories(data);
  };

  // Generic handler for submitting forms
  const handleSubmit = async (
    e: React.FormEvent,
    action: 'business' | 'categoryGroup' | 'paymentSource' | 'category' | 'model' | 'recipient',
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
        case 'categoryGroup':
          if (editingId) await updateCategory(editingId, data);
          else await addCategory(data);
          setShowCategoryGroupModal(false);
          loadCategories();
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
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('保存に失敗:', errorMessage, error);
      alert(`保存に失敗しました: ${errorMessage}`);
    }
  };

  // Generic handler for deletion
  const handleDelete = async (
    id: string,
    action: 'business' | 'categoryGroup' | 'paymentSource' | 'category' | 'model' | 'recipient'
  ) => {
    if (!confirm('本当に削除しますか？')) return;
    try {
      switch (action) {
        case 'business':
          await deleteBusiness(id);
          loadBusinesses();
          break;
        case 'categoryGroup':
          await deleteCategory(id);
          loadCategories();
          loadBusinesses(); // カテゴリ削除後、事業も再読み込み
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
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('削除に失敗:', errorMessage, error);
      alert(`削除に失敗しました: ${errorMessage}`);
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

      <Tabs defaultValue="categoryGroup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categoryGroup">カテゴリ管理</TabsTrigger>
          <TabsTrigger value="business">事業管理</TabsTrigger>
          <TabsTrigger value="payment">支払い・分配</TabsTrigger>
          <TabsTrigger value="category">経費カテゴリー</TabsTrigger>
          <TabsTrigger value="model">部署</TabsTrigger>
        </TabsList>

        {/* カテゴリ管理 */}
        <TabsContent value="categoryGroup">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>カテゴリ一覧</CardTitle>
                <CardDescription>事業をグループ化するカテゴリを管理します</CardDescription>
              </div>
              <Button onClick={() => { setEditingCategoryGroup(null); setShowCategoryGroupModal(true); }} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" /> 追加
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8">
                  <LoadingOverlay />
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      カテゴリが登録されていません
                      <br />
                      <span className="text-sm">カテゴリを追加すると、事業をグループ化できます</span>
                    </div>
                  ) : (
                    categories.map((category) => {
                      const businessCount = businesses.filter(b => b.categoryId === category.id || b.category === category.name).length;
                      return (
                        <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: category.color || '#3b82f6' }}
                            >
                              <Folder className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{category.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {businessCount}事業が所属
                                {category.memo && ` • ${category.memo}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingCategoryGroup(category); setShowCategoryGroupModal(true); }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id!, 'categoryGroup')} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 事業管理 */}
        <TabsContent value="business">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>事業一覧</CardTitle>
                <CardDescription>カテゴリごとに事業を管理します</CardDescription>
              </div>
              <Button onClick={() => { setEditingBusiness(null); setShowBusinessModal(true); }} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" /> 追加
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8">
                  <LoadingOverlay />
                </div>
              ) : businesses.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">事業が登録されていません</p>
                  <Button onClick={() => { setEditingBusiness(null); setShowBusinessModal(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> 事業を追加
                  </Button>
                </div>
              ) : (
              <div className="space-y-6">
                {/* カテゴリごとにグループ化 */}
                {(() => {
                  // カテゴリIDまたはカテゴリ名でグループ化
                  const categoryMap = new Map<string, { name: string; color?: string; businesses: Business[] }>();
                  
                  // まず、カテゴリマスターからグループを作成
                  categories.forEach(cat => {
                    categoryMap.set(cat.id!, { name: cat.name, color: cat.color, businesses: [] });
                  });
                  
                  // カテゴリなしの事業用
                  const uncategorized: Business[] = [];
                  
                  // 事業をカテゴリごとに分類
                  businesses.forEach(biz => {
                    if (biz.categoryId && categoryMap.has(biz.categoryId)) {
                      categoryMap.get(biz.categoryId)!.businesses.push(biz);
                    } else if (biz.category) {
                      // カテゴリ名でグループ化（後方互換性）
                      const key = `name:${biz.category}`;
                      if (!categoryMap.has(key)) {
                        categoryMap.set(key, { name: biz.category, businesses: [] });
                      }
                      categoryMap.get(key)!.businesses.push(biz);
                    } else {
                      uncategorized.push(biz);
                    }
                  });
                  
                  // カテゴリなしがある場合は追加
                  if (uncategorized.length > 0) {
                    categoryMap.set('uncategorized', { name: 'その他', businesses: uncategorized });
                  }
                  
                  // 事業が1つ以上あるカテゴリのみ表示
                  const sortedCategories = Array.from(categoryMap.entries())
                    .filter(([, group]) => group.businesses.length > 0)
                    .sort((a, b) => {
                      const catA = categories.find(c => c.id === a[0]);
                      const catB = categories.find(c => c.id === b[0]);
                      if (catA && catB) {
                        return (catA.displayOrder || 0) - (catB.displayOrder || 0);
                      }
                      if (a[0] === 'uncategorized') return 999;
                      if (b[0] === 'uncategorized') return -999;
                      return a[1].name.localeCompare(b[1].name);
                    });
                  
                  return sortedCategories.map(([key, group]) => (
                    <div key={key}>
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-muted-foreground">
                        {group.color ? (
                          <div 
                            className="w-5 h-5 rounded-lg"
                            style={{ backgroundColor: group.color }}
                          />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                        {group.name}
                        <span className="text-sm font-normal">({group.businesses.length})</span>
                      </h3>
                      <div className="space-y-2 ml-6">
                        {group.businesses.map((business) => (
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
                    </div>
                  ));
                })()}
              </div>
              )}
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
                <Button size="sm" onClick={() => { setEditingPaymentSource(null); setShowPaymentSourceModal(true); }} disabled={loading}>
                  <Plus className="mr-2 h-4 w-4" /> 追加
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8">
                    <LoadingOverlay />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentSources.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        支払い元が登録されていません
                      </div>
                    ) : (
                      paymentSources.map((source) => (
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
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>分配先</CardTitle>
                  <CardDescription>利益の分配対象となる人や組織</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditingRecipient(null); setShowRecipientModal(true); }} disabled={loading}>
                  <Plus className="mr-2 h-4 w-4" /> 追加
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8">
                    <LoadingOverlay />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipients.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        分配先が登録されていません
                      </div>
                    ) : (
                      recipients.map((recipient) => (
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
                      ))
                    )}
                  </div>
                )}
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
              <Button onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" /> 追加
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8">
                  <LoadingOverlay />
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {expenseCategories.length === 0 ? (
                    <div className="col-span-full text-center py-4 text-muted-foreground text-sm">
                      経費カテゴリーが登録されていません
                    </div>
                  ) : (
                    expenseCategories.map((category) => (
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
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 部署 */}
        <TabsContent value="model">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>部署一覧</CardTitle>
                <CardDescription>事業に紐づく詳細なモデルや部署を管理します</CardDescription>
              </div>
              <Button onClick={() => { setEditingModel(null); setSelectedBusinessForModel(''); setShowModelModal(true); }} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" /> 追加
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8">
                  <LoadingOverlay />
                </div>
              ) : (
                <div className="space-y-6">
                  {models.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      部署が登録されていません
                    </div>
                  ) : (
                    businesses.map((business) => {
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
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- Modals --- */}
      
      {/* Category Group Modal */}
      {showCategoryGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingCategoryGroup ? 'カテゴリを編集' : 'カテゴリを追加'}</h2>
            <form onSubmit={(e) => {
              const formData = new FormData(e.currentTarget);
              handleSubmit(e, 'categoryGroup', {
                name: formData.get('name'),
                color: formData.get('color'),
                displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
                memo: formData.get('memo') || '',
              }, editingCategoryGroup?.id);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">カテゴリ名 *</label>
                  <Input name="name" defaultValue={editingCategoryGroup?.name} placeholder="例: SNS事業, コンサル事業" required />
                </div>
                <div>
                  <label className="text-sm font-medium">テーマカラー</label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      name="color" 
                      defaultValue={editingCategoryGroup?.color || '#3b82f6'} 
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      name="color_text" 
                      defaultValue={editingCategoryGroup?.color || '#3b82f6'} 
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
                  <label className="text-sm font-medium">表示順序</label>
                  <Input 
                    type="number" 
                    name="displayOrder" 
                    defaultValue={editingCategoryGroup?.displayOrder || 0} 
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">数値が小さいほど上に表示されます</p>
                </div>
                <div>
                  <label className="text-sm font-medium">メモ</label>
                  <Input name="memo" defaultValue={editingCategoryGroup?.memo || ''} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCategoryGroupModal(false)}>キャンセル</Button>
                  <Button type="submit">保存</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Business Modal */}
      {showBusinessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingBusiness ? '事業を編集' : '事業を追加'}</h2>
            <form onSubmit={(e) => {
              const formData = new FormData(e.currentTarget);
              const categoryId = formData.get('categoryId') as string;
              handleSubmit(e, 'business', {
                name: formData.get('name'),
                categoryId: categoryId || undefined,
                category: categoryId ? undefined : (formData.get('category') as string || undefined),
                memo: formData.get('memo'),
                color: formData.get('color'),
              }, editingBusiness?.id);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">カテゴリ</label>
                  {categories.length > 0 ? (
                    <select
                      name="categoryId"
                      defaultValue={editingBusiness?.categoryId || ''}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">カテゴリなし</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <Input 
                        name="category" 
                        defaultValue={editingBusiness?.category || ''} 
                        placeholder="例: SNS事業, コンサル事業"
                      />
                      <p className="text-xs text-muted-foreground">カテゴリが登録されていない場合は、直接入力してください</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">同じカテゴリの事業がグループ化されます</p>
                </div>
                <div>
                  <label className="text-sm font-medium">事業名 *</label>
                  <Input name="name" defaultValue={editingBusiness?.name} placeholder="例: のの, りん, 学べると" required />
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
