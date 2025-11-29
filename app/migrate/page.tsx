'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface MigrationData {
  businesses: any[];
  expenses: any[];
  profits: any[];
  paymentSources: any[];
  expenseCategories: any[];
  recipients: any[];
  distributions: any[];
  assets: any[];
  models: any[];
}

export default function MigratePage() {
  const [data, setData] = useState<MigrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sqlOutput, setSqlOutput] = useState('');

  useEffect(() => {
    loadFirebaseData();
  }, []);

  const loadFirebaseData = async () => {
    try {
      setLoading(true);
      
      if (!db) {
        alert('Firebase が初期化されていません。.env.local ファイルを確認してください。');
        setLoading(false);
        return;
      }
      
      const [
        businessesSnap,
        expensesSnap,
        profitsSnap,
        paymentSourcesSnap,
        expenseCategoriesSnap,
        recipientsSnap,
        distributionsSnap,
        assetsSnap,
        modelsSnap,
      ] = await Promise.all([
        getDocs(collection(db!, 'businesses')),
        getDocs(collection(db!, 'expenses')),
        getDocs(collection(db!, 'profits')),
        getDocs(collection(db!, 'paymentSources')),
        getDocs(collection(db!, 'expenseCategories')),
        getDocs(collection(db!, 'recipients')),
        getDocs(collection(db!, 'revenueDistributions')),
        getDocs(collection(db!, 'assets')),
        getDocs(collection(db!, 'models')),
      ]);

      const migrationData: MigrationData = {
        businesses: businessesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        expenses: expensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        profits: profitsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        paymentSources: paymentSourcesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        expenseCategories: expenseCategoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        recipients: recipientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        distributions: distributionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        assets: assetsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        models: modelsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      };

      setData(migrationData);
      generateSQL(migrationData);
    } catch (error) {
      console.error('データ取得エラー:', error);
      alert('Firebaseからのデータ取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const escapeSQL = (str: string | null | undefined): string => {
    if (str === null || str === undefined) return '';
    return String(str).replace(/'/g, "''");
  };

  const generateSQL = (data: MigrationData) => {
    let sql = '-- Firebase to D1 Migration SQL\n\n';

    // Businesses
    if (data.businesses.length > 0) {
      sql += '-- Businesses\n';
      data.businesses.forEach(b => {
        sql += `INSERT INTO businesses (name, memo) VALUES ('${escapeSQL(b.name)}', '${escapeSQL(b.memo || '')}');\n`;
      });
      sql += '\n';
    }

    // Payment Sources
    if (data.paymentSources.length > 0) {
      sql += '-- Payment Sources\n';
      data.paymentSources.forEach(p => {
        sql += `INSERT INTO payment_sources (name, memo) VALUES ('${escapeSQL(p.name)}', '${escapeSQL(p.memo || '')}');\n`;
      });
      sql += '\n';
    }

    // Expense Categories
    if (data.expenseCategories.length > 0) {
      sql += '-- Expense Categories\n';
      data.expenseCategories.forEach(c => {
        sql += `INSERT INTO expense_categories (name, memo) VALUES ('${escapeSQL(c.name)}', '${escapeSQL(c.memo || '')}');\n`;
      });
      sql += '\n';
    }

    // Recipients
    if (data.recipients.length > 0) {
      sql += '-- Recipients\n';
      data.recipients.forEach(r => {
        sql += `INSERT INTO recipients (name, memo) VALUES ('${escapeSQL(r.name)}', '${escapeSQL(r.memo || '')}');\n`;
      });
      sql += '\n';
    }

    // Expenses
    if (data.expenses.length > 0) {
      sql += '-- Expenses\n';
      data.expenses.forEach(e => {
        const date = e.date?.toDate ? e.date.toDate().toISOString().split('T')[0] : e.date || '';
        sql += `INSERT INTO expenses (date, month, business, payment_source, category, description, amount, memo, source_data) VALUES ('${escapeSQL(date)}', '${escapeSQL(e.month)}', '${escapeSQL(e.business)}', '${escapeSQL(e.paymentSource)}', '${escapeSQL(e.category)}', '${escapeSQL(e.description)}', ${e.amount || 0}, '${escapeSQL(e.memo)}', '${escapeSQL(e.sourceData)}');\n`;
      });
      sql += '\n';
    }

    // Profits
    if (data.profits.length > 0) {
      sql += '-- Profits\n';
      data.profits.forEach(p => {
        const revenues = JSON.stringify(p.revenues || {}).replace(/'/g, "''");
        sql += `INSERT INTO profits (month, revenues, total_revenue, total_expense, gross_profit, net_profit) VALUES ('${escapeSQL(p.month)}', '${revenues}', ${p.totalRevenue || 0}, ${p.totalExpense || 0}, ${p.grossProfit || 0}, ${p.netProfit || 0});\n`;
      });
      sql += '\n';
    }

    // Assets
    if (data.assets.length > 0) {
      sql += '-- Assets\n';
      data.assets.forEach(a => {
        const updateDate = a.updateDate?.toDate ? a.updateDate.toDate().toISOString().split('T')[0] : a.updateDate || '';
        sql += `INSERT INTO assets (asset_type, name, affiliation, current_balance, currency, update_date, memo) VALUES ('${escapeSQL(a.assetType)}', '${escapeSQL(a.name)}', '${escapeSQL(a.affiliation)}', ${a.currentBalance || 0}, '${escapeSQL(a.currency || 'JPY')}', '${escapeSQL(updateDate)}', '${escapeSQL(a.memo)}');\n`;
      });
      sql += '\n';
    }

    // Revenue Distributions
    if (data.distributions.length > 0) {
      sql += '-- Revenue Distributions\n';
      data.distributions.forEach(d => {
        sql += `INSERT INTO revenue_distributions (business_name, model_name, recipient_name, distribution_type, value, memo) VALUES ('${escapeSQL(d.businessName)}', '${escapeSQL(d.modelName || '')}', '${escapeSQL(d.recipientName)}', '${escapeSQL(d.distributionType)}', ${d.value || 0}, '${escapeSQL(d.memo || '')}');\n`;
      });
      sql += '\n';
    }

    // Models
    if (data.models.length > 0) {
      sql += '-- Models\n';
      data.models.forEach(m => {
        sql += `INSERT INTO models (business_id, business_name, name, memo) VALUES (0, '${escapeSQL(m.businessName)}', '${escapeSQL(m.name)}', '${escapeSQL(m.memo || '')}');\n`;
      });
      sql += '\n';
    }

    setSqlOutput(sql);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlOutput);
    alert('SQLをクリップボードにコピーしました！');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Firebase → D1 データ移行</h1>
      
      {loading ? (
        <p className="text-gray-600">Firebaseからデータを読み込み中...</p>
      ) : (
        <>
          {/* データサマリー */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Firebaseデータサマリー</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{data?.businesses.length || 0}</div>
                <div className="text-sm text-gray-600">事業</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{data?.expenses.length || 0}</div>
                <div className="text-sm text-gray-600">経費</div>
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">{data?.profits.length || 0}</div>
                <div className="text-sm text-gray-600">利益データ</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded">
                <div className="text-2xl font-bold text-yellow-600">{data?.paymentSources.length || 0}</div>
                <div className="text-sm text-gray-600">支払い元</div>
              </div>
              <div className="p-3 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">{data?.expenseCategories.length || 0}</div>
                <div className="text-sm text-gray-600">経費カテゴリー</div>
              </div>
              <div className="p-3 bg-indigo-50 rounded">
                <div className="text-2xl font-bold text-indigo-600">{data?.recipients.length || 0}</div>
                <div className="text-sm text-gray-600">分配先</div>
              </div>
              <div className="p-3 bg-pink-50 rounded">
                <div className="text-2xl font-bold text-pink-600">{data?.distributions.length || 0}</div>
                <div className="text-sm text-gray-600">収益分配</div>
              </div>
              <div className="p-3 bg-teal-50 rounded">
                <div className="text-2xl font-bold text-teal-600">{data?.assets.length || 0}</div>
                <div className="text-sm text-gray-600">資産</div>
              </div>
              <div className="p-3 bg-orange-50 rounded">
                <div className="text-2xl font-bold text-orange-600">{data?.models.length || 0}</div>
                <div className="text-sm text-gray-600">モデル</div>
              </div>
            </div>
          </div>

          {/* SQL出力 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">移行用SQL</h2>
              <button
                onClick={copyToClipboard}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                SQLをコピー
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              このSQLをCloudflare D1のコンソールに貼り付けて実行してください。
            </p>
            <textarea
              value={sqlOutput}
              readOnly
              className="w-full h-96 font-mono text-sm border rounded p-4 bg-gray-50 text-gray-900"
            />
          </div>
        </>
      )}
    </div>
  );
}

