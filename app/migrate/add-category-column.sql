-- businesses テーブルに category カラムを追加するマイグレーション
-- Supabase SQL Editor で実行してください

-- category カラムを追加（既に存在する場合は何もしない）
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';

-- 既存データのカテゴリを自動設定（オプション）
-- 事業名からカテゴリを推測して設定
UPDATE businesses SET category = 'MyFans' WHERE name LIKE 'Myfan%' OR name LIKE 'MyFan%';
UPDATE businesses SET category = 'YouTube' WHERE name LIKE '%YouTube%';
UPDATE businesses SET category = 'その他' WHERE category = '' OR category IS NULL;

-- 確認用クエリ
-- SELECT name, category FROM businesses ORDER BY category, name;


