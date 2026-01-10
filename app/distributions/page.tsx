'use client';

import { useState, useEffect } from 'react';
import { getAllBusinesses, getAllPaymentSources, getAllRecipients, getAllRevenueDistributions, addRevenueDistribution, updateRevenueDistribution, deleteRevenueDistribution } from '@/lib/supabase-db';
import { Business, PaymentSource, Recipient } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingOverlay } from '@/components/ui/loading';

interface Distribution {
  id?: string;
  businessName: string;
  recipientName: string;
  distributionType: 'percentage' | 'amount';
  value: number;
}

export default function DistributionsPage() {
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newDistributionType, setNewDistributionType] = useState<'percentage' | 'amount'>('percentage');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [businessData, recipientData, paymentSourceData, distributionsData] = await Promise.all([
        getAllBusinesses(),
        getAllRecipients(),
        getAllPaymentSources(),
        getAllRevenueDistributions(),
      ]);
      
      setBusinesses(businessData);
      
      // 支払い元も分配先として使えるようにマージ
      const allRecipients = [...recipientData];
      paymentSourceData.forEach(ps => {
        if (!allRecipients.some(r => r.name === ps.name)) {
          allRecipients.push({
            id: ps.id,
            name: ps.name,
            memo: ps.memo || '',
          });
        }
      });
      setRecipients(allRecipients);
      
      if (!selectedBusiness && businessData.length > 0) {
        setSelectedBusiness(businessData[0].name);
      }
      
      setDistributions(distributionsData.map(dist => ({
        id: dist.id,
        businessName: dist.businessName,
        recipientName: dist.recipientName,
        distributionType: dist.distributionType,
        value: dist.value,
      })));
      
    } catch (error) {
      console.error('データの読み込みに失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipientName || !newValue) {
      alert('すべての項目を入力してください');
      return;
    }
    
    const value = parseFloat(newValue);
    if (isNaN(value) || value < 0) {
      alert('有効な値を入力してください');
      return;
    }
    
    try {
      await addRevenueDistribution({
        businessName: selectedBusiness,
        recipientName: newRecipientName,
        distributionType: newDistributionType,
        value,
        memo: '',
      });
      setShowAddModal(false);
      setNewRecipientName('');
      setNewValue('');
      loadData();
    } catch (error) {
      console.error('分配設定の追加に失敗:', error);
      alert('追加に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この設定を削除しますか？')) return;
    try {
      await deleteRevenueDistribution(id);
      loadData();
    } catch (error) {
      console.error('削除に失敗:', error);
      alert('削除に失敗しました');
    }
  };

  const handleValueChange = async (d: Distribution, newValue: string) => {
    if (!d.id) return;
    const value = parseFloat(newValue);
    if (isNaN(value)) return;
    
    try {
      await updateRevenueDistribution(d.id, { value });
      // ローカルステートだけ更新してUXを向上させることも可能だが、
      // ここではデータを再読み込みして確実に同期
      loadData();
    } catch (error) {
      console.error('更新に失敗:', error);
    }
  };

  const filteredDistributions = distributions.filter(d => d.businessName === selectedBusiness);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">収益分配設定</h1>
          <p className="text-muted-foreground mt-1">
            事業ごとの利益分配ルールを設定します
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="w-64">
          <label className="text-sm font-medium mb-1 block">事業を選択</label>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {businesses.map(business => (
              <option key={business.id} value={business.name}>{business.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>{selectedBusiness} の分配ルール</CardTitle>
            <CardDescription>
              利益から固定費を引いた金額に対して適用されます
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            ルールを追加
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingOverlay />
          ) : filteredDistributions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              分配ルールが設定されていません
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>分配先</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead className="text-right">値</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDistributions.map((dist) => (
                    <TableRow key={dist.id}>
                      <TableCell className="font-medium">
                        {dist.recipientName}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          dist.distributionType === 'percentage' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {dist.distributionType === 'percentage' ? '割合 (%)' : '固定額 (円)'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Input
                            type="number"
                            defaultValue={dist.value}
                            className="w-24 text-right h-8"
                            onBlur={(e) => handleValueChange(dist, e.target.value)}
                          />
                          <span className="text-sm text-muted-foreground w-4">
                            {dist.distributionType === 'percentage' ? '%' : '円'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(dist.id!)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">分配ルールを追加</h2>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">分配先</label>
                <select
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">選択してください</option>
                  {recipients.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">タイプ</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={newDistributionType === 'percentage'}
                      onChange={() => setNewDistributionType('percentage')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>割合 (%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={newDistributionType === 'amount'}
                      onChange={() => setNewDistributionType('amount')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>固定額 (円)</span>
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">値</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="0"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                    {newDistributionType === 'percentage' ? '%' : '円'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                  キャンセル
                </Button>
                <Button type="submit">追加</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
