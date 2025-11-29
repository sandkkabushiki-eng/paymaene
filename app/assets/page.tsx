'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllAssets, addAsset, updateAsset, deleteAsset } from '@/lib/firestore';
import { Asset } from '@/lib/types';
import { format } from 'date-fns';

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
    } catch (error) {
      console.error('資産データの保存に失敗:', error);
      alert('保存に失敗しました');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">資産管理</h1>
          <Link href="/" className="text-blue-600 hover:underline">← ホームに戻る</Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setEditingAsset(null);
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
                  <label className="block mb-1">資産種別 *</label>
                  <input
                    type="text"
                    name="assetType"
                    defaultValue={editingAsset?.assetType || ''}
                    required
                    className="w-full border rounded px-3 py-2"
                    placeholder="例: 銀行口座、投資信託、現金"
                  />
                </div>
                <div>
                  <label className="block mb-1">名称 *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingAsset?.name || ''}
                    required
                    className="w-full border rounded px-3 py-2"
                    placeholder="例: 三菱UFJ銀行 普通預金"
                  />
                </div>
                <div>
                  <label className="block mb-1">所属</label>
                  <input
                    type="text"
                    name="affiliation"
                    defaultValue={editingAsset?.affiliation || ''}
                    className="w-full border rounded px-3 py-2"
                    placeholder="例: 個人、MyFans事業"
                  />
                </div>
                <div>
                  <label className="block mb-1">現在残高 *</label>
                  <input
                    type="number"
                    name="currentBalance"
                    defaultValue={editingAsset?.currentBalance || ''}
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1">通貨</label>
                  <select
                    name="currency"
                    defaultValue={editingAsset?.currency || 'JPY'}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="JPY">JPY (円)</option>
                    <option value="USD">USD (ドル)</option>
                    <option value="EUR">EUR (ユーロ)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">更新日 *</label>
                  <input
                    type="date"
                    name="updateDate"
                    defaultValue={editingAsset?.updateDate instanceof Date 
                      ? format(editingAsset.updateDate, 'yyyy-MM-dd')
                      : editingAsset?.updateDate || format(new Date(), 'yyyy-MM-dd')}
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1">メモ</label>
                  <textarea
                    name="memo"
                    defaultValue={editingAsset?.memo || ''}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  {editingAsset ? '更新' : '追加'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">資産一覧</h2>
          {loading ? (
            <p className="text-gray-500">読み込み中...</p>
          ) : assets.length === 0 ? (
            <p className="text-gray-500">資産データがありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">資産種別</th>
                    <th className="text-left p-3">名称</th>
                    <th className="text-left p-3">所属</th>
                    <th className="text-right p-3">現在残高</th>
                    <th className="text-left p-3">通貨</th>
                    <th className="text-left p-3">更新日</th>
                    <th className="text-left p-3">メモ</th>
                    <th className="text-left p-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{asset.assetType}</td>
                      <td className="p-3">{asset.name}</td>
                      <td className="p-3">{asset.affiliation || '-'}</td>
                      <td className="p-3 text-right">
                        {asset.currency === 'JPY' ? '¥' : asset.currency + ' '}
                        {asset.currentBalance.toLocaleString()}
                      </td>
                      <td className="p-3">{asset.currency}</td>
                      <td className="p-3">
                        {asset.updateDate instanceof Date 
                          ? format(asset.updateDate, 'yyyy/MM/dd')
                          : asset.updateDate}
                      </td>
                      <td className="p-3">{asset.memo || '-'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleEdit(asset)}
                          className="text-blue-600 hover:underline mr-2"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id!)}
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

