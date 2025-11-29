-- D1 Database Schema for Sales Management App

-- 事業テーブル
CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  memo TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- モデル/部署テーブル
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  business_name TEXT NOT NULL,
  name TEXT NOT NULL,
  memo TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 支払い元テーブル
CREATE TABLE IF NOT EXISTS payment_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  memo TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 経費カテゴリーテーブル
CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  memo TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 分配先テーブル
CREATE TABLE IF NOT EXISTS recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  memo TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 経費テーブル
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  business TEXT DEFAULT '',
  payment_source TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  memo TEXT DEFAULT '',
  source_data TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 利益テーブル
CREATE TABLE IF NOT EXISTS profits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL UNIQUE,
  revenues TEXT DEFAULT '{}',  -- JSON形式で事業別売上を保存
  total_revenue REAL DEFAULT 0,
  total_expense REAL DEFAULT 0,
  gross_profit REAL DEFAULT 0,
  net_profit REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 資産テーブル
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_type TEXT NOT NULL,
  name TEXT NOT NULL,
  affiliation TEXT DEFAULT '',
  current_balance REAL DEFAULT 0,
  currency TEXT DEFAULT 'JPY',
  update_date TEXT,
  memo TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 収益分配テーブル
CREATE TABLE IF NOT EXISTS revenue_distributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL,
  model_name TEXT DEFAULT '',
  recipient_name TEXT NOT NULL,
  distribution_type TEXT NOT NULL CHECK (distribution_type IN ('percentage', 'amount')),
  value REAL NOT NULL DEFAULT 0,
  memo TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month);
CREATE INDEX IF NOT EXISTS idx_expenses_business ON expenses(business);
CREATE INDEX IF NOT EXISTS idx_profits_month ON profits(month);
CREATE INDEX IF NOT EXISTS idx_models_business_id ON models(business_id);
CREATE INDEX IF NOT EXISTS idx_revenue_distributions_business ON revenue_distributions(business_name);

