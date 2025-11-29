import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// GET: 経費一覧取得
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    
    let query = 'SELECT * FROM expenses';
    let params: string[] = [];
    
    if (month) {
      query += ' WHERE month = ?';
      params.push(month);
    }
    
    query += ' ORDER BY date DESC';
    
    const stmt = db.prepare(query);
    const { results } = month 
      ? await stmt.bind(month).all()
      : await stmt.all();
    
    return NextResponse.json(results || []);
  } catch (error: any) {
    console.error('経費取得エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 経費追加
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const data = await request.json();
    
    const result = await db.prepare(`
      INSERT INTO expenses (date, month, business, payment_source, category, description, amount, memo, source_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.date,
      data.month,
      data.business || '',
      data.paymentSource,
      data.category,
      data.description || '',
      data.amount,
      data.memo || '',
      data.sourceData || ''
    ).run();
    
    return NextResponse.json({ 
      id: result.meta?.last_row_id,
      ...data
    });
  } catch (error: any) {
    console.error('経費追加エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 経費更新
export async function PUT(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 });
    }
    
    await db.prepare(`
      UPDATE expenses SET 
        date = ?, month = ?, business = ?, payment_source = ?, 
        category = ?, description = ?, amount = ?, memo = ?, 
        source_data = ?, updated_at = datetime("now")
      WHERE id = ?
    `).bind(
      data.date,
      data.month,
      data.business || '',
      data.paymentSource,
      data.category,
      data.description || '',
      data.amount,
      data.memo || '',
      data.sourceData || '',
      data.id
    ).run();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('経費更新エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 経費削除
export async function DELETE(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 });
    }
    
    await db.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('経費削除エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

