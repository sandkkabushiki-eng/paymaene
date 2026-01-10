-- ステップ4: RLSを有効化する（重要！）
-- Supabase SQL Editorで実行してください
-- ※ステップ3の後に必ずこのSQLを実行してください
-- これを実行しないと、RLSポリシーが適用されません！

-- ==============================================
-- すべてのテーブルでRLSを有効化
-- ==============================================

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

-- categoriesテーブルが存在する場合のみ実行
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'categories') THEN
    EXECUTE 'ALTER TABLE categories ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ==============================================
-- categoriesテーブルのRLSポリシーを追加（不足していた）
-- ==============================================

-- 既存のポリシーがあれば削除
DROP POLICY IF EXISTS "Allow all for categories" ON categories;
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

-- 新しいポリシーを作成
CREATE POLICY "Users can view own categories" ON categories 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories 
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- 既存のRLSポリシーが存在しない場合、再作成
-- ==============================================

-- 事業テーブル
DROP POLICY IF EXISTS "Users can view own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can insert own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can delete own businesses" ON businesses;

CREATE POLICY "Users can view own businesses" ON businesses 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own businesses" ON businesses 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own businesses" ON businesses 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own businesses" ON businesses 
  FOR DELETE USING (auth.uid() = user_id);

-- 支払元テーブル
DROP POLICY IF EXISTS "Users can view own payment_sources" ON payment_sources;
DROP POLICY IF EXISTS "Users can insert own payment_sources" ON payment_sources;
DROP POLICY IF EXISTS "Users can update own payment_sources" ON payment_sources;
DROP POLICY IF EXISTS "Users can delete own payment_sources" ON payment_sources;

CREATE POLICY "Users can view own payment_sources" ON payment_sources 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment_sources" ON payment_sources 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payment_sources" ON payment_sources 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own payment_sources" ON payment_sources 
  FOR DELETE USING (auth.uid() = user_id);

-- 経費カテゴリーテーブル
DROP POLICY IF EXISTS "Users can view own expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "Users can insert own expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "Users can update own expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "Users can delete own expense_categories" ON expense_categories;

CREATE POLICY "Users can view own expense_categories" ON expense_categories 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expense_categories" ON expense_categories 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expense_categories" ON expense_categories 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own expense_categories" ON expense_categories 
  FOR DELETE USING (auth.uid() = user_id);

-- 分配先テーブル
DROP POLICY IF EXISTS "Users can view own recipients" ON recipients;
DROP POLICY IF EXISTS "Users can insert own recipients" ON recipients;
DROP POLICY IF EXISTS "Users can update own recipients" ON recipients;
DROP POLICY IF EXISTS "Users can delete own recipients" ON recipients;

CREATE POLICY "Users can view own recipients" ON recipients 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recipients" ON recipients 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipients" ON recipients 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipients" ON recipients 
  FOR DELETE USING (auth.uid() = user_id);

-- 経費テーブル
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

CREATE POLICY "Users can view own expenses" ON expenses 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses 
  FOR DELETE USING (auth.uid() = user_id);

-- 利益テーブル
DROP POLICY IF EXISTS "Users can view own profits" ON profits;
DROP POLICY IF EXISTS "Users can insert own profits" ON profits;
DROP POLICY IF EXISTS "Users can update own profits" ON profits;
DROP POLICY IF EXISTS "Users can delete own profits" ON profits;

CREATE POLICY "Users can view own profits" ON profits 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profits" ON profits 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profits" ON profits 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own profits" ON profits 
  FOR DELETE USING (auth.uid() = user_id);

-- 資産テーブル
DROP POLICY IF EXISTS "Users can view own assets" ON assets;
DROP POLICY IF EXISTS "Users can insert own assets" ON assets;
DROP POLICY IF EXISTS "Users can update own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete own assets" ON assets;

CREATE POLICY "Users can view own assets" ON assets 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assets" ON assets 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON assets 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON assets 
  FOR DELETE USING (auth.uid() = user_id);

-- 収益分配テーブル
DROP POLICY IF EXISTS "Users can view own revenue_distributions" ON revenue_distributions;
DROP POLICY IF EXISTS "Users can insert own revenue_distributions" ON revenue_distributions;
DROP POLICY IF EXISTS "Users can update own revenue_distributions" ON revenue_distributions;
DROP POLICY IF EXISTS "Users can delete own revenue_distributions" ON revenue_distributions;

CREATE POLICY "Users can view own revenue_distributions" ON revenue_distributions 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revenue_distributions" ON revenue_distributions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own revenue_distributions" ON revenue_distributions 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own revenue_distributions" ON revenue_distributions 
  FOR DELETE USING (auth.uid() = user_id);

-- モデルテーブル
DROP POLICY IF EXISTS "Users can view own models" ON models;
DROP POLICY IF EXISTS "Users can insert own models" ON models;
DROP POLICY IF EXISTS "Users can update own models" ON models;
DROP POLICY IF EXISTS "Users can delete own models" ON models;

CREATE POLICY "Users can view own models" ON models 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own models" ON models 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own models" ON models 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own models" ON models 
  FOR DELETE USING (auth.uid() = user_id);

-- 振り込みステータステーブル
DROP POLICY IF EXISTS "Users can view own transfer_statuses" ON transfer_statuses;
DROP POLICY IF EXISTS "Users can insert own transfer_statuses" ON transfer_statuses;
DROP POLICY IF EXISTS "Users can update own transfer_statuses" ON transfer_statuses;
DROP POLICY IF EXISTS "Users can delete own transfer_statuses" ON transfer_statuses;

CREATE POLICY "Users can view own transfer_statuses" ON transfer_statuses 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transfer_statuses" ON transfer_statuses 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transfer_statuses" ON transfer_statuses 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own transfer_statuses" ON transfer_statuses 
  FOR DELETE USING (auth.uid() = user_id);
