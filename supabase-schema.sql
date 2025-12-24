-- Supabase Schema for 売り上げ管理アプリ
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== 事業テーブル ==========
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  memo TEXT DEFAULT '',
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 支払元テーブル ==========
CREATE TABLE IF NOT EXISTS payment_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 経費カテゴリーテーブル ==========
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 分配先テーブル ==========
CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 経費テーブル ==========
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  month TEXT NOT NULL,
  business TEXT NOT NULL,
  payment_source TEXT DEFAULT '',
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 0,
  memo TEXT DEFAULT '',
  source_data TEXT DEFAULT '',
  is_fixed_cost BOOLEAN DEFAULT FALSE,
  fixed_cost_id UUID NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 利益テーブル ==========
CREATE TABLE IF NOT EXISTS profits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month TEXT NOT NULL UNIQUE,
  revenues JSONB DEFAULT '{}',
  total_revenue INTEGER DEFAULT 0,
  total_expense INTEGER DEFAULT 0,
  gross_profit INTEGER DEFAULT 0,
  net_profit INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 資産テーブル ==========
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_type TEXT NOT NULL,
  name TEXT NOT NULL,
  affiliation TEXT DEFAULT '',
  current_balance INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'JPY',
  update_date DATE,
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 収益分配テーブル ==========
CREATE TABLE IF NOT EXISTS revenue_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  model_name TEXT,
  recipient_name TEXT NOT NULL,
  distribution_type TEXT NOT NULL CHECK (distribution_type IN ('percentage', 'amount')),
  value NUMERIC NOT NULL DEFAULT 0,
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== モデルテーブル ==========
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  name TEXT NOT NULL,
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 振り込みステータステーブル ==========
CREATE TABLE IF NOT EXISTS transfer_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  business_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  paid_at TIMESTAMPTZ,
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, recipient_name, business_name)
);

-- ========== インデックス作成 ==========
CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month);
CREATE INDEX IF NOT EXISTS idx_expenses_business ON expenses(business);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_profits_month ON profits(month);
CREATE INDEX IF NOT EXISTS idx_revenue_distributions_business ON revenue_distributions(business_name);
CREATE INDEX IF NOT EXISTS idx_models_business ON models(business_name);
CREATE INDEX IF NOT EXISTS idx_transfer_statuses_month ON transfer_statuses(month);
CREATE INDEX IF NOT EXISTS idx_transfer_statuses_recipient ON transfer_statuses(recipient_name);

-- ========== 更新日時自動更新トリガー ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにトリガーを適用
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_sources_updated_at ON payment_sources;
CREATE TRIGGER update_payment_sources_updated_at BEFORE UPDATE ON payment_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recipients_updated_at ON recipients;
CREATE TRIGGER update_recipients_updated_at BEFORE UPDATE ON recipients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profits_updated_at ON profits;
CREATE TRIGGER update_profits_updated_at BEFORE UPDATE ON profits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_revenue_distributions_updated_at ON revenue_distributions;
CREATE TRIGGER update_revenue_distributions_updated_at BEFORE UPDATE ON revenue_distributions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_models_updated_at ON models;
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transfer_statuses_updated_at ON transfer_statuses;
CREATE TRIGGER update_transfer_statuses_updated_at BEFORE UPDATE ON transfer_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== Row Level Security (RLS) ==========
-- 開発中はRLSを無効化（本番環境では適切に設定してください）
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profits ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_statuses ENABLE ROW LEVEL SECURITY;

-- 全ユーザーにアクセスを許可するポリシー（開発用）
CREATE POLICY "Allow all for businesses" ON businesses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for payment_sources" ON payment_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for expense_categories" ON expense_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for recipients" ON recipients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for profits" ON profits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for assets" ON assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for revenue_distributions" ON revenue_distributions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for models" ON models FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for transfer_statuses" ON transfer_statuses FOR ALL USING (true) WITH CHECK (true);

