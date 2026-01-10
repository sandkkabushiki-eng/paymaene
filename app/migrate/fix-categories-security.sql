-- カテゴリテーブルのセキュリティ修正
-- Supabase SQL Editorで実行してください
-- ※このSQLを実行すると、categoriesテーブルもユーザーごとにデータが分離されます

-- ステップ1: user_id列を追加（まだない場合）
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- ステップ2: 既存データにuser_idを設定
-- ※以下のYOUR_USER_IDを自分のユーザーIDに置き換えてください
-- ユーザーIDは以下のSQLで確認できます:
-- SELECT id, email FROM auth.users;

-- 例: UPDATE categories SET user_id = 'cb101665-1eef-44e7-b20e-98559fc59c4e' WHERE user_id IS NULL;
UPDATE categories SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;

-- ステップ3: RLSを有効化
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ステップ4: 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow all for categories" ON categories;
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

-- ステップ5: 新しいRLSポリシーを作成
CREATE POLICY "Users can view own categories" ON categories 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories 
  FOR DELETE USING (auth.uid() = user_id);
