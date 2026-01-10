-- ステップ1: 各テーブルにuser_id列を追加
-- Supabase SQL Editorで実行してください
-- ※このSQLを最初に実行してください

-- 事業テーブル
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 支払元テーブル
ALTER TABLE payment_sources ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 経費カテゴリーテーブル
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 分配先テーブル
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 経費テーブル
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 利益テーブル
ALTER TABLE profits ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 資産テーブル
ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 収益分配テーブル
ALTER TABLE revenue_distributions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- モデルテーブル
ALTER TABLE models ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 振り込みステータステーブル
ALTER TABLE transfer_statuses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sources_user_id ON payment_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_recipients_user_id ON recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_profits_user_id ON profits(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_distributions_user_id ON revenue_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_statuses_user_id ON transfer_statuses(user_id);
