import Papa from 'papaparse';
import { Expense } from './types';
import { addExpense, getExpenses } from './firestore';

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

