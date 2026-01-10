-- ステップ3: RLSポリシーをユーザー別に更新
-- Supabase SQL Editorで実行してください
-- ※ステップ2を実行した後に、このSQLを実行してください

-- 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "Allow all for businesses" ON businesses;
DROP POLICY IF EXISTS "Allow all for payment_sources" ON payment_sources;
DROP POLICY IF EXISTS "Allow all for expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "Allow all for recipients" ON recipients;
DROP POLICY IF EXISTS "Allow all for expenses" ON expenses;
DROP POLICY IF EXISTS "Allow all for profits" ON profits;
DROP POLICY IF EXISTS "Allow all for assets" ON assets;
DROP POLICY IF EXISTS "Allow all for revenue_distributions" ON revenue_distributions;
DROP POLICY IF EXISTS "Allow all for models" ON models;
DROP POLICY IF EXISTS "Allow all for transfer_statuses" ON transfer_statuses;

-- 事業テーブル
CREATE POLICY "Users can view own businesses" ON businesses 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own businesses" ON businesses 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own businesses" ON businesses 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own businesses" ON businesses 
  FOR DELETE USING (auth.uid() = user_id);

-- 支払元テーブル
CREATE POLICY "Users can view own payment_sources" ON payment_sources 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment_sources" ON payment_sources 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payment_sources" ON payment_sources 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own payment_sources" ON payment_sources 
  FOR DELETE USING (auth.uid() = user_id);

-- 経費カテゴリーテーブル
CREATE POLICY "Users can view own expense_categories" ON expense_categories 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expense_categories" ON expense_categories 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expense_categories" ON expense_categories 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own expense_categories" ON expense_categories 
  FOR DELETE USING (auth.uid() = user_id);

-- 分配先テーブル
CREATE POLICY "Users can view own recipients" ON recipients 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recipients" ON recipients 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipients" ON recipients 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipients" ON recipients 
  FOR DELETE USING (auth.uid() = user_id);

-- 経費テーブル
CREATE POLICY "Users can view own expenses" ON expenses 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses 
  FOR DELETE USING (auth.uid() = user_id);

-- 利益テーブル
CREATE POLICY "Users can view own profits" ON profits 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profits" ON profits 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profits" ON profits 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own profits" ON profits 
  FOR DELETE USING (auth.uid() = user_id);

-- 資産テーブル
CREATE POLICY "Users can view own assets" ON assets 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assets" ON assets 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON assets 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON assets 
  FOR DELETE USING (auth.uid() = user_id);

-- 収益分配テーブル
CREATE POLICY "Users can view own revenue_distributions" ON revenue_distributions 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revenue_distributions" ON revenue_distributions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own revenue_distributions" ON revenue_distributions 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own revenue_distributions" ON revenue_distributions 
  FOR DELETE USING (auth.uid() = user_id);

-- モデルテーブル
CREATE POLICY "Users can view own models" ON models 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own models" ON models 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own models" ON models 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own models" ON models 
  FOR DELETE USING (auth.uid() = user_id);

-- 振り込みステータステーブル
CREATE POLICY "Users can view own transfer_statuses" ON transfer_statuses 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transfer_statuses" ON transfer_statuses 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transfer_statuses" ON transfer_statuses 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own transfer_statuses" ON transfer_statuses 
  FOR DELETE USING (auth.uid() = user_id);

-- ユニーク制約を更新
ALTER TABLE profits DROP CONSTRAINT IF EXISTS profits_month_key;
ALTER TABLE profits ADD CONSTRAINT profits_month_user_id_key UNIQUE (month, user_id);

ALTER TABLE transfer_statuses DROP CONSTRAINT IF EXISTS transfer_statuses_month_recipient_name_business_name_key;
ALTER TABLE transfer_statuses ADD CONSTRAINT transfer_statuses_month_recipient_business_user_key 
  UNIQUE (month, recipient_name, business_name, user_id);
