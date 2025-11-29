// D1 Database Types and Utilities

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: {
    duration: number;
    changes: number;
    last_row_id: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// Cloudflare環境からD1を取得
export function getD1(env: { DB: D1Database }): D1Database {
  return env.DB;
}

// 日付をISO形式に変換
export function toISODate(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString();
}

// ISO形式の日付をDateオブジェクトに変換
export function fromISODate(isoDate: string): Date {
  return new Date(isoDate);
}

