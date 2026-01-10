-- 初期ユーザー作成SQL
-- Supabase Dashboard > Authentication > Users で作成するか、
-- 以下のSQLをSQL Editorで実行してください

-- ※注意: このSQLはSupabaseのサービスロールキーが必要です
-- Supabase Dashboard > Authentication > Users から「Add user」で作成することを推奨します

-- ユーザー情報:
-- Email: shokei0402@gmail.com
-- Password: shokei0402

-- Supabase DashboardでのUI操作手順:
-- 1. Supabase Dashboard (https://supabase.com) にログイン
-- 2. プロジェクトを選択
-- 3. 左メニューから「Authentication」をクリック
-- 4. 「Users」タブをクリック
-- 5. 「Add user」ボタンをクリック
-- 6. 以下の情報を入力:
--    - Email: shokei0402@gmail.com
--    - Password: shokei0402
--    - Auto Confirm User: チェックを入れる
-- 7. 「Create user」をクリック

-- 既存データにuser_idを設定する（ユーザー作成後に実行）
-- 以下のSQLでユーザーIDを取得して設定してください

-- 1. まずユーザーIDを確認
-- SELECT id FROM auth.users WHERE email = 'shokei0402@gmail.com';

-- 2. 取得したユーザーIDで既存データを更新（YOUR_USER_IDを置き換えてください）
/*
UPDATE businesses SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE payment_sources SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE expense_categories SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE recipients SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE expenses SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE profits SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE assets SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE revenue_distributions SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE models SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE transfer_statuses SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE categories SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
*/
