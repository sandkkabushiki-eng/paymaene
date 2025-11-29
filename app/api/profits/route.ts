import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// GET: 利益データ取得
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    
    let query = 'SELECT * FROM profits';
    
    if (month) {
      query += ' WHERE month = ?';
      const result = await db.prepare(query).bind(month).first();
      if (result) {
        // JSONをパース
        const parsed = {
          ...result as any,
          revenues: JSON.parse((result as any).revenues || '{}')
        };
        return NextResponse.json(parsed);
      }
      return NextResponse.json(null);
    }
    
    query += ' ORDER BY month DESC';
    const { results } = await db.prepare(query).all();
    
    // revenuesをパース
    const parsed = (results || []).map((r: any) => ({
      ...r,
      revenues: JSON.parse(r.revenues || '{}')
    }));
    
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('利益取得エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 利益データ追加/更新
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const data = await request.json();
    
    if (!data.month) {
      return NextResponse.json({ error: '月は必須です' }, { status: 400 });
    }
    
    // 既存データを確認
    const existing = await db.prepare(
      'SELECT id FROM profits WHERE month = ?'
    ).bind(data.month).first();
    
    const revenuesJson = JSON.stringify(data.revenues || {});
    
    if (existing) {
      // 更新
      await db.prepare(`
        UPDATE profits SET 
          revenues = ?, total_revenue = ?, total_expense = ?,
          gross_profit = ?, net_profit = ?, updated_at = datetime("now")
        WHERE month = ?
      `).bind(
        revenuesJson,
        data.totalRevenue || 0,
        data.totalExpense || 0,
        data.grossProfit || 0,
        data.netProfit || 0,
        data.month
      ).run();
      
      return NextResponse.json({ id: (existing as any).id, ...data });
    } else {
      // 新規作成
      const result = await db.prepare(`
        INSERT INTO profits (month, revenues, total_revenue, total_expense, gross_profit, net_profit)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        data.month,
        revenuesJson,
        data.totalRevenue || 0,
        data.totalExpense || 0,
        data.grossProfit || 0,
        data.netProfit || 0
      ).run();
      
      return NextResponse.json({ id: result.meta?.last_row_id, ...data });
    }
  } catch (error: any) {
    console.error('利益追加/更新エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 利益データ削除
export async function DELETE(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    
    if (!month) {
      return NextResponse.json({ error: '月は必須です' }, { status: 400 });
    }
    
    await db.prepare('DELETE FROM profits WHERE month = ?').bind(month).run();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('利益削除エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

