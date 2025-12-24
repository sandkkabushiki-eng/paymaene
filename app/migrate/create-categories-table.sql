-- カテゴリテーブルを作成するマイグレーション
-- Supabase SQL Editor で実行してください

-- カテゴリテーブル作成
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  display_order INTEGER DEFAULT 0,
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- businessesテーブルにcategory_idカラムを追加（既存のcategoryカラムは残す）
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_businesses_category_id ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- 更新日時自動更新トリガー
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);

-- デフォルトカテゴリを追加（オプション）
INSERT INTO categories (name, color, display_order) VALUES
  ('MyFans', '#3b82f6', 1),
  ('YouTube', '#ef4444', 2),
  ('その他', '#6b7280', 99)
ON CONFLICT (name) DO NOTHING;

-- 既存のbusinessesのcategoryカラムからカテゴリを作成し、category_idを設定
-- categoryカラムが存在する場合のみ実行
DO $$
DECLARE
  cat_record RECORD;
  biz_record RECORD;
  category_column_exists BOOLEAN;
BEGIN
  -- categoryカラムの存在確認
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'category'
  ) INTO category_column_exists;
  
  -- categoryカラムが存在する場合のみ処理
  IF category_column_exists THEN
    -- 既存のcategory値からカテゴリを作成
    FOR cat_record IN SELECT DISTINCT category FROM businesses WHERE category IS NOT NULL AND category != '' LOOP
      INSERT INTO categories (name, color, display_order)
      VALUES (cat_record.category, '#3b82f6', 0)
      ON CONFLICT (name) DO NOTHING;
    END LOOP;
    
    -- businessesのcategory_idを設定
    FOR biz_record IN SELECT id, category FROM businesses WHERE category IS NOT NULL AND category != '' LOOP
      UPDATE businesses
      SET category_id = (SELECT id FROM categories WHERE name = biz_record.category LIMIT 1)
      WHERE id = biz_record.id;
    END LOOP;
  END IF;
END $$;

-- 確認用クエリ
-- SELECT c.name, COUNT(b.id) as business_count FROM categories c LEFT JOIN businesses b ON c.id = b.category_id GROUP BY c.id, c.name ORDER BY c.display_order;

