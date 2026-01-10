import { describe, it, expect } from 'vitest';
import {
  toDate,
  toDateOrNull,
  toString,
  mapToBusiness,
  mapToExpense,
  mapToProfit,
  mapToPaymentSource,
  mapToExpenseCategory,
  mapToRecipient,
  mapToAsset,
  mapToTransferStatus,
  isTableNotFoundError,
  isColumnNotFoundError,
  isNotFoundError,
} from './db-mappers';

describe('db-mappers', () => {
  // ========== ユーティリティ関数 ==========
  
  describe('toDate', () => {
    it('有効な日付文字列をDateに変換', () => {
      const result = toDate('2025-01-15T10:30:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2025-01-15T10:30:00.000Z');
    });

    it('nullの場合は現在日時を返す', () => {
      const before = new Date();
      const result = toDate(null);
      const after = new Date();
      expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('undefinedの場合は現在日時を返す', () => {
      const result = toDate(undefined);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('toDateOrNull', () => {
    it('有効な日付文字列をDateに変換', () => {
      const result = toDateOrNull('2025-01-15T10:30:00.000Z');
      expect(result).toBeInstanceOf(Date);
    });

    it('nullの場合はnullを返す', () => {
      expect(toDateOrNull(null)).toBeNull();
    });

    it('undefinedの場合はnullを返す', () => {
      expect(toDateOrNull(undefined)).toBeNull();
    });
  });

  describe('toString', () => {
    it('文字列はそのまま返す', () => {
      expect(toString('hello')).toBe('hello');
    });

    it('空文字列もそのまま返す', () => {
      expect(toString('')).toBe('');
    });

    it('nullの場合はデフォルト値を返す', () => {
      expect(toString(null)).toBe('');
      expect(toString(null, 'default')).toBe('default');
    });

    it('undefinedの場合はデフォルト値を返す', () => {
      expect(toString(undefined)).toBe('');
    });
  });

  // ========== エンティティマッパー ==========

  describe('mapToBusiness', () => {
    it('DB行をBusinessエンティティに変換', () => {
      const dbRow = {
        id: 'uuid-123',
        name: 'テスト事業',
        category: 'カテゴリA',
        category_id: 'cat-uuid',
        memo: 'メモ',
        color: '#ff0000',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-02T00:00:00.000Z',
      };

      const result = mapToBusiness(dbRow);

      expect(result.id).toBe('uuid-123');
      expect(result.name).toBe('テスト事業');
      expect(result.category).toBe('カテゴリA');
      expect(result.categoryId).toBe('cat-uuid');
      expect(result.memo).toBe('メモ');
      expect(result.color).toBe('#ff0000');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('categoriesオブジェクトから名前と色を取得', () => {
      const dbRow = {
        id: 'uuid-123',
        name: 'テスト事業',
        category: '',
        category_id: 'cat-uuid',
        memo: '',
        color: null,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };
      const categories = { name: 'JOINカテゴリ', color: '#00ff00' };

      const result = mapToBusiness(dbRow, categories);

      expect(result.category).toBe('JOINカテゴリ');
      expect(result.color).toBe('#00ff00');
    });
  });

  describe('mapToExpense', () => {
    it('DB行をExpenseエンティティに変換', () => {
      const dbRow = {
        id: 'exp-123',
        date: '2025-01-15',
        month: '2025-01',
        business: '事業A',
        payment_source: 'AMEX',
        category: '交通費',
        description: 'タクシー代',
        amount: 5000,
        memo: 'メモ',
        source_data: 'import.csv',
        is_fixed_cost: true,
        fixed_cost_id: 'fixed-123',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const result = mapToExpense(dbRow);

      expect(result.id).toBe('exp-123');
      expect(result.date).toBeInstanceOf(Date);
      expect(result.month).toBe('2025-01');
      expect(result.business).toBe('事業A');
      expect(result.paymentSource).toBe('AMEX');
      expect(result.category).toBe('交通費');
      expect(result.description).toBe('タクシー代');
      expect(result.amount).toBe(5000);
      expect(result.isFixedCost).toBe(true);
      expect(result.fixedCostId).toBe('fixed-123');
    });
  });

  describe('mapToProfit', () => {
    it('DB行をProfitエンティティに変換', () => {
      const dbRow = {
        id: 'profit-123',
        month: '2025-01',
        revenues: { '事業A': 100000, '事業B': 50000 },
        total_revenue: 150000,
        total_expense: 30000,
        gross_profit: 120000,
        net_profit: 100000,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const result = mapToProfit(dbRow);

      expect(result.id).toBe('profit-123');
      expect(result.month).toBe('2025-01');
      expect(result.revenues).toEqual({ '事業A': 100000, '事業B': 50000 });
      expect(result.totalRevenue).toBe(150000);
      expect(result.totalExpense).toBe(30000);
      expect(result.grossProfit).toBe(120000);
      expect(result.netProfit).toBe(100000);
    });
  });

  describe('mapToPaymentSource / mapToExpenseCategory / mapToRecipient (共通構造)', () => {
    const dbRow = {
      id: 'uuid-123',
      name: 'テスト名',
      memo: 'メモ',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-02T00:00:00.000Z',
    };

    it('mapToPaymentSourceが正しく変換', () => {
      const result = mapToPaymentSource(dbRow);
      expect(result.id).toBe('uuid-123');
      expect(result.name).toBe('テスト名');
      expect(result.memo).toBe('メモ');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('mapToExpenseCategoryが正しく変換', () => {
      const result = mapToExpenseCategory(dbRow);
      expect(result.id).toBe('uuid-123');
      expect(result.name).toBe('テスト名');
    });

    it('mapToRecipientが正しく変換', () => {
      const result = mapToRecipient(dbRow);
      expect(result.id).toBe('uuid-123');
      expect(result.name).toBe('テスト名');
    });
  });

  describe('mapToAsset', () => {
    it('DB行をAssetエンティティに変換', () => {
      const dbRow = {
        id: 'asset-123',
        asset_type: '銀行口座',
        name: '普通預金',
        affiliation: 'みずほ銀行',
        current_balance: 1000000,
        currency: 'JPY',
        update_date: '2025-01-15',
        memo: 'メモ',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const result = mapToAsset(dbRow);

      expect(result.id).toBe('asset-123');
      expect(result.assetType).toBe('銀行口座');
      expect(result.name).toBe('普通預金');
      expect(result.affiliation).toBe('みずほ銀行');
      expect(result.currentBalance).toBe(1000000);
      expect(result.currency).toBe('JPY');
      expect(result.updateDate).toBeInstanceOf(Date);
    });
  });

  describe('mapToTransferStatus', () => {
    it('DB行をTransferStatusエンティティに変換', () => {
      const dbRow = {
        id: 'ts-123',
        month: '2025-01',
        recipient_name: '分配先A',
        business_name: '事業A',
        status: 'paid',
        paid_at: '2025-01-20T10:00:00.000Z',
        memo: 'メモ',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const result = mapToTransferStatus(dbRow);

      expect(result.id).toBe('ts-123');
      expect(result.status).toBe('paid');
      expect(result.paidAt).toBeInstanceOf(Date);
    });

    it('paid_atがnullの場合はnullを返す', () => {
      const dbRow = {
        id: 'ts-123',
        month: '2025-01',
        recipient_name: '分配先A',
        business_name: '事業A',
        status: 'unpaid',
        paid_at: null,
        memo: '',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const result = mapToTransferStatus(dbRow);

      expect(result.paidAt).toBeNull();
    });
  });

  // ========== エラー判定 ==========

  describe('isTableNotFoundError', () => {
    it('42P01コードをtableNotFoundと判定', () => {
      expect(isTableNotFoundError({ code: '42P01' })).toBe(true);
    });

    it('PGRST204コードをtableNotFoundと判定', () => {
      expect(isTableNotFoundError({ code: 'PGRST204' })).toBe(true);
    });

    it('"does not exist"メッセージをtableNotFoundと判定', () => {
      expect(isTableNotFoundError({ message: 'relation does not exist' })).toBe(true);
    });

    it('通常エラーはfalse', () => {
      expect(isTableNotFoundError({ code: 'OTHER' })).toBe(false);
    });
  });

  describe('isColumnNotFoundError', () => {
    it('42703コードをcolumnNotFoundと判定', () => {
      expect(isColumnNotFoundError({ code: '42703' })).toBe(true);
    });

    it('categoryを含むメッセージをcolumnNotFoundと判定', () => {
      expect(isColumnNotFoundError({ message: 'category_id column not found' })).toBe(true);
    });
  });

  describe('isNotFoundError', () => {
    it('PGRST116コードをnotFoundと判定', () => {
      expect(isNotFoundError({ code: 'PGRST116' })).toBe(true);
    });

    it('他のコードはfalse', () => {
      expect(isNotFoundError({ code: 'OTHER' })).toBe(false);
    });
  });
});
