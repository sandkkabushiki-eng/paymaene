-- カテゴリテーブルのユニーク制約を修正
-- Supabase SQL Editorで実行してください
-- ※このSQLを実行すると、同じカテゴリ名を異なるユーザーが使えるようになります

-- 既存のユニーク制約を削除
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- ユーザーごとに名前がユニークになるよう新しい制約を追加
ALTER TABLE categories ADD CONSTRAINT categories_name_user_id_key UNIQUE (name, user_id);
