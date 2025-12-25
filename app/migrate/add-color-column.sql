-- businesses テーブルに color カラムを追加するマイグレーション
-- Supabase SQL Editor で実行してください

-- color カラムを追加（既に存在する場合は何もしない）
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

-- 確認用クエリ
-- SELECT * FROM businesses LIMIT 5;


