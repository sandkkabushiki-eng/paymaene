import Papa from 'papaparse';
import { Expense } from './types';
import { addExpense, getExpenses } from './supabase-db';

// 取り込んだ売上データ（事業が未選択の状態）
export interface ImportedRevenue {
  id: string; // 一時的なID
  date: Date | string;
  month: string; // "2025-10" 形式
  amount: number;
  description: string;
  sourceType: 'bank' | 'card'; // 銀行 or カード
  sourceData: string; // ファイル名など
  business?: string; // 選択された事業名（未選択の場合はundefined）
}

// CSVファイルをパースして経費データに変換
export function parseAmexCsv(csvText: string, fileName: string): Expense[] {
  const expenses: Expense[] = [];
  
  // ファイル名から月を抽出（例: "2025-10.csv" → "2025-10"）
  let monthFromFilename = '';
  const monthMatch = fileName.match(/(\d{4})-(\d{2})/);
  if (monthMatch) {
    monthFromFilename = `${monthMatch[1]}-${monthMatch[2]}`;
  }
  
  // CSVをパース
  const result = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: true,
  });
  
  // データ行を処理（最初の行はヘッダーの可能性があるのでスキップ）
  for (let i = 1; i < result.data.length; i++) {
    const row = result.data[i] as string[];
    if (row.length < 4) continue;
    
    // 日付をパース（column 0: ご利用日）
    let dateValue: Date | null = null;
    const dateStr = row[0];
    if (dateStr) {
      // "2025/10/02" 形式をパース
      const dateMatch = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1; // 0ベース
        const day = parseInt(dateMatch[3]);
        dateValue = new Date(year, month, day);
      }
    }
    
    // 月を決定（ファイル名から、または日付から）
    let month = monthFromFilename;
    if (!month && dateValue) {
      const year = dateValue.getFullYear();
      const monthNum = String(dateValue.getMonth() + 1).padStart(2, '0');
      month = `${year}-${monthNum}`;
    }
    
    // 金額をパース（column 3: 金額、カンマを除去）
    let amount = 0;
    const amountStr = row[3];
    if (amountStr) {
      const cleanedAmount = amountStr.replace(/,/g, '').replace(/円/g, '');
      amount = parseFloat(cleanedAmount) || 0;
    }
    
    // 経費データを作成
    const expense: Expense = {
      date: dateValue || dateStr,
      month: month || '',
      business: '',
      paymentSource: 'AMEX',
      category: '',
      description: row[2] || '',
      amount: amount,
      memo: '',
      sourceData: fileName,
    };
    
    expenses.push(expense);
  }
  
  return expenses;
}

// CSVファイルをアップロードして経費データを取り込む
export async function importCsvFile(file: File): Promise<{ success: number; skipped: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const fileName = file.name;
        
        // 既存の元データをチェック
        const existingExpenses = await getExpenses();
        const existingFilenames = new Set(
          existingExpenses
            .map(exp => exp.sourceData)
            .filter(Boolean)
        );
        
        if (existingFilenames.has(fileName)) {
          resolve({ success: 0, skipped: 1 });
          return;
        }
        
        // CSVをパース
        const expenses = parseAmexCsv(csvText, fileName);
        
        // データベースに追加
        let successCount = 0;
        for (const expense of expenses) {
          try {
            await addExpense(expense);
            successCount++;
          } catch (error) {
            console.error('経費データの追加に失敗:', error);
          }
        }
        
        resolve({ success: successCount, skipped: 0 });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    
    // Shift_JISで読み込みを試行、失敗したらUTF-8
    reader.readAsText(file, 'Shift_JIS');
  });
}

// 銀行の振り込みCSVをパース（一般的なフォーマットに対応）
export function parseBankCsv(csvText: string, fileName: string): ImportedRevenue[] {
  const revenues: ImportedRevenue[] = [];
  
  // CSVをパース
  const result = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: true,
  });
  
  if (result.data.length === 0) return revenues;
  
  // ヘッダー行を検出（最初の行がヘッダーの可能性）
  const firstRow = result.data[0] as string[];
  let headerRowIndex = 0;
  let dateColumnIndex = -1;
  let descriptionColumnIndex = -1;
  let amountColumnIndex = -1;
  
  // ヘッダー行を探す（日付、内容、金額などのキーワードを含む行）
  for (let i = 0; i < Math.min(3, result.data.length); i++) {
    const row = result.data[i] as string[];
    const rowText = row.join('').toLowerCase();
    
    // 日付、内容、金額の列を特定
    for (let j = 0; j < row.length; j++) {
      const cell = (row[j] || '').toLowerCase();
      if ((cell.includes('日付') || cell.includes('日') || cell.includes('date')) && dateColumnIndex === -1) {
        dateColumnIndex = j;
        headerRowIndex = i;
      }
      if ((cell.includes('内容') || cell.includes('摘要') || cell.includes('摘要') || cell.includes('description') || cell.includes('memo')) && descriptionColumnIndex === -1) {
        descriptionColumnIndex = j;
      }
      if ((cell.includes('金額') || cell.includes('入金') || cell.includes('amount')) && amountColumnIndex === -1) {
        amountColumnIndex = j;
      }
    }
  }
  
  // ヘッダーが見つからない場合、最初の行をデータとして扱う
  const startIndex = headerRowIndex > 0 ? headerRowIndex + 1 : 1;
  
  // 列インデックスが特定できなかった場合、デフォルト値を設定
  if (dateColumnIndex === -1) dateColumnIndex = 0;
  if (descriptionColumnIndex === -1) descriptionColumnIndex = dateColumnIndex + 1;
  if (amountColumnIndex === -1) amountColumnIndex = descriptionColumnIndex + 1;
  
  // データ行を処理
  for (let i = startIndex; i < result.data.length; i++) {
    const row = result.data[i] as string[];
    if (row.length < Math.max(dateColumnIndex, descriptionColumnIndex, amountColumnIndex) + 1) continue;
    
    // 日付をパース
    let dateValue: Date | null = null;
    const dateStr = row[dateColumnIndex] || '';
    
    // 様々な日付形式に対応
    const datePatterns = [
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/, // 2025/10/02
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // 2025-10-02
      /(\d{4})(\d{2})(\d{2})/, // 20251002
    ];
    
    for (const pattern of datePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        dateValue = new Date(year, month, day);
        break;
      }
    }
    
    if (!dateValue) continue; // 日付がパースできない場合はスキップ
    
    // 月を決定
    const year = dateValue.getFullYear();
    const monthNum = String(dateValue.getMonth() + 1).padStart(2, '0');
    const month = `${year}-${monthNum}`;
    
    // 金額をパース（入金のみを対象、マイナス値は除外）
    let amount = 0;
    const amountStr = row[amountColumnIndex] || '';
    if (amountStr) {
      const cleanedAmount = amountStr.replace(/,/g, '').replace(/円/g, '').replace(/¥/g, '').trim();
      const parsedAmount = parseFloat(cleanedAmount) || 0;
      // 入金のみ（プラスの値）を対象とする
      if (parsedAmount > 0) {
        amount = parsedAmount;
      } else {
        continue; // 出金やマイナス値はスキップ
      }
    } else {
      continue; // 金額がない場合はスキップ
    }
    
    // 説明を取得
    const description = (row[descriptionColumnIndex] || '').trim();
    
    // 売上データを作成
    const revenue: ImportedRevenue = {
      id: `temp-${i}-${Date.now()}`,
      date: dateValue,
      month: month,
      amount: amount,
      description: description || '（説明なし）',
      sourceType: 'bank',
      sourceData: fileName,
    };
    
    revenues.push(revenue);
  }
  
  return revenues;
}

// カードの振り込みCSVをパース（一般的なフォーマットに対応）
export function parseCardCsv(csvText: string, fileName: string): ImportedRevenue[] {
  const revenues: ImportedRevenue[] = [];
  
  // CSVをパース
  const result = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: true,
  });
  
  if (result.data.length === 0) return revenues;
  
  // ファイル名から月を抽出（例: "2025-10.csv" → "2025-10"）
  let monthFromFilename = '';
  const monthMatch = fileName.match(/(\d{4})-(\d{2})/);
  if (monthMatch) {
    monthFromFilename = `${monthMatch[1]}-${monthMatch[2]}`;
  }
  
  // ヘッダー行を検出
  const firstRow = result.data[0] as string[];
  let headerRowIndex = 0;
  let dateColumnIndex = -1;
  let descriptionColumnIndex = -1;
  let amountColumnIndex = -1;
  
  for (let i = 0; i < Math.min(3, result.data.length); i++) {
    const row = result.data[i] as string[];
    for (let j = 0; j < row.length; j++) {
      const cell = (row[j] || '').toLowerCase();
      if ((cell.includes('日付') || cell.includes('日') || cell.includes('date')) && dateColumnIndex === -1) {
        dateColumnIndex = j;
        headerRowIndex = i;
      }
      if ((cell.includes('内容') || cell.includes('摘要') || cell.includes('description') || cell.includes('memo') || cell.includes('店舗')) && descriptionColumnIndex === -1) {
        descriptionColumnIndex = j;
      }
      if ((cell.includes('金額') || cell.includes('入金') || cell.includes('amount')) && amountColumnIndex === -1) {
        amountColumnIndex = j;
      }
    }
  }
  
  const startIndex = headerRowIndex > 0 ? headerRowIndex + 1 : 1;
  
  if (dateColumnIndex === -1) dateColumnIndex = 0;
  if (descriptionColumnIndex === -1) descriptionColumnIndex = dateColumnIndex + 1;
  if (amountColumnIndex === -1) amountColumnIndex = descriptionColumnIndex + 1;
  
  // データ行を処理
  for (let i = startIndex; i < result.data.length; i++) {
    const row = result.data[i] as string[];
    if (row.length < Math.max(dateColumnIndex, descriptionColumnIndex, amountColumnIndex) + 1) continue;
    
    // 日付をパース
    let dateValue: Date | null = null;
    const dateStr = row[dateColumnIndex] || '';
    
    const datePatterns = [
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{4})(\d{2})(\d{2})/,
    ];
    
    for (const pattern of datePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        dateValue = new Date(year, month, day);
        break;
      }
    }
    
    if (!dateValue) continue;
    
    // 月を決定
    let month = monthFromFilename;
    if (!month && dateValue) {
      const year = dateValue.getFullYear();
      const monthNum = String(dateValue.getMonth() + 1).padStart(2, '0');
      month = `${year}-${monthNum}`;
    }
    
    // 金額をパース（入金のみ）
    let amount = 0;
    const amountStr = row[amountColumnIndex] || '';
    if (amountStr) {
      const cleanedAmount = amountStr.replace(/,/g, '').replace(/円/g, '').replace(/¥/g, '').trim();
      const parsedAmount = parseFloat(cleanedAmount) || 0;
      if (parsedAmount > 0) {
        amount = parsedAmount;
      } else {
        continue;
      }
    } else {
      continue;
    }
    
    const description = (row[descriptionColumnIndex] || '').trim();
    
    const revenue: ImportedRevenue = {
      id: `temp-${i}-${Date.now()}`,
      date: dateValue,
      month: month,
      amount: amount,
      description: description || '（説明なし）',
      sourceType: 'card',
      sourceData: fileName,
    };
    
    revenues.push(revenue);
  }
  
  return revenues;
}

// CSVファイルを読み込んで売上データをパース（事業は未選択の状態で返す）
export function parseRevenueCsv(file: File): Promise<ImportedRevenue[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const fileName = file.name.toLowerCase();
        
        let revenues: ImportedRevenue[] = [];
        
        // ファイル名や内容から銀行かカードかを判定
        if (fileName.includes('銀行') || fileName.includes('bank') || fileName.includes('振込') || fileName.includes('入金')) {
          revenues = parseBankCsv(csvText, file.name);
        } else if (fileName.includes('カード') || fileName.includes('card') || fileName.includes('amex') || fileName.includes('visa')) {
          revenues = parseCardCsv(csvText, file.name);
        } else {
          // デフォルトで銀行フォーマットとして試行
          revenues = parseBankCsv(csvText, file.name);
          // パース結果が空の場合、カードフォーマットとして試行
          if (revenues.length === 0) {
            revenues = parseCardCsv(csvText, file.name);
          }
        }
        
        resolve(revenues);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    
    // Shift_JISで読み込みを試行、失敗したらUTF-8
    reader.readAsText(file, 'Shift_JIS');
  });
}

