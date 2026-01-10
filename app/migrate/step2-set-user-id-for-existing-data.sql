-- ステップ2: 既存データにユーザーIDを設定
-- Supabase SQL Editorで実行してください
-- ※ステップ1を実行した後に、このSQLを実行してください

-- まずユーザーIDを確認
SELECT id, email FROM auth.users WHERE email = 'shokei0402@gmail.com';

-- ↓↓↓ 上のクエリで取得したIDを下記の 'YOUR_USER_ID' に置き換えて実行 ↓↓↓

/*
-- 全テーブルの既存データにuser_idを設定
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
*/
