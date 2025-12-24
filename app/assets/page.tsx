'use client';

import { useState, useEffect } from 'react';
import { getAllAssets, addAsset, updateAsset, deleteAsset } from '@/lib/supabase-db';
import { Asset } from '@/lib/types';
import { format } from 'date-fns';
import { Plus, Wallet, Edit2, Trash2, X, Globe, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await getAllAssets();
      setAssets(data);
    } catch (error) {
      console.error('資産データの読み込みに失敗:', error);
      alert('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const assetData: Omit<Asset, 'id'> = {
      assetType: formData.get('assetType') as string || '',
      name: formData.get('name') as string || '',
      affiliation: formData.get('affiliation') as string || '',
      currentBalance: parseFloat(formData.get('currentBalance') as string) || 0,
      currency: formData.get('currency') as string || 'JPY',
      updateDate: formData.get('updateDate') as string || new Date().toISOString(),
      memo: formData.get('memo') as string || '',
    };

    try {
      if (editingAsset?.id) {
        await updateAsset(editingAsset.id, assetData);
      } else {
        await addAsset(assetData);
      }
      setShowForm(false);
      setEditingAsset(null);
      loadAssets();
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('資産データの保存に失敗:', errorMessage, error);
      alert(`保存に失敗しました: ${errorMessage}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この資産を削除しますか？')) return;
    
    try {
      await deleteAsset(id);
      loadAssets();
    } catch (error) {
      console.error('資産データの削除に失敗:', error);
      alert('削除に失敗しました');
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setShowForm(true);
  };

  // 通貨ごとの合計を計算
  const totalByCurrency = assets.reduce((acc, asset) => {
    const currency = asset.currency || 'JPY';
    if (!acc[currency]) acc[currency] = 0;
    acc[currency] += asset.currentBalance;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">資産管理</h1>
          <p className="text-muted-foreground mt-1">
            銀行口座、投資信託、現金などの資産を管理します
          </p>
        </div>
        <Button onClick={() => {
          setEditingAsset(null);
          setShowForm(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          資産を追加
        </Button>
      </div>

      {/* 合計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(totalByCurrency).map(([currency, total]) => (
          <Card key={currency} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">合計 ({currency})</CardTitle>
              <Wallet className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currency === 'JPY' ? '¥' : currency + ' '}
                {total.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>資産一覧</CardTitle>
          <CardDescription>登録されている全資産のリスト</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              読み込み中...
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <div className="p-3 bg-gray-100 rounded-full">
                <Wallet className="h-6 w-6 text-gray-400" />
              </div>
              <p>資産データがありません</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>資産種別</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>所属</TableHead>
                    <TableHead className="text-right">現在残高</TableHead>
                    <TableHead>更新日</TableHead>
                    <TableHead>メモ</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {asset.assetType}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {asset.affiliation || '未設定'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {asset.currency === 'JPY' ? '¥' : asset.currency + ' '}
                        {asset.currentBalance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {asset.updateDate instanceof Date 
                          ? format(asset.updateDate, 'yyyy/MM/dd')
                          : asset.updateDate}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate" title={asset.memo}>
                        {asset.memo || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(asset)}
                            title="編集"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(asset.id!)}
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
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingAsset ? '資産を編集' : '資産を追加'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">資産種別 *</label>
                    <Input
                      type="text"
                      name="assetType"
                      defaultValue={editingAsset?.assetType || ''}
                      required
                      placeholder="例: 銀行口座"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">名称 *</label>
                    <Input
                      type="text"
                      name="name"
                      defaultValue={editingAsset?.name || ''}
                      required
                      placeholder="例: 三菱UFJ銀行"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">所属</label>
                    <Input
                      type="text"
                      name="affiliation"
                      defaultValue={editingAsset?.affiliation || ''}
                      placeholder="例: 個人、事業"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">通貨</label>
                    <div className="relative">
                      <select
                        name="currency"
                        defaultValue={editingAsset?.currency || 'JPY'}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none"
                      >
                        <option value="JPY">JPY (円)</option>
                        <option value="USD">USD (ドル)</option>
                        <option value="EUR">EUR (ユーロ)</option>
                      </select>
                      <Globe className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">現在残高 *</label>
                    <Input
                      type="number"
                      name="currentBalance"
                      defaultValue={editingAsset?.currentBalance || ''}
                      required
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">更新日 *</label>
                    <Input
                      type="date"
                      name="updateDate"
                      defaultValue={editingAsset?.updateDate instanceof Date 
                        ? format(editingAsset.updateDate, 'yyyy-MM-dd')
                        : editingAsset?.updateDate || format(new Date(), 'yyyy-MM-dd')}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">メモ</label>
                  <textarea
                    name="memo"
                    defaultValue={editingAsset?.memo || ''}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="備考など"
                  />
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
                  {editingAsset ? '更新する' : '追加する'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
