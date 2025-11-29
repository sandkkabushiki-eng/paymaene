import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// GET: 収益分配一覧取得
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const businessName = searchParams.get('businessName');
    
    let query = 'SELECT * FROM revenue_distributions';
    
    if (businessName) {
      query += ' WHERE business_name = ?';
      const { results } = await db.prepare(query).bind(businessName).all();
      return NextResponse.json(results || []);
    }
    
    query += ' ORDER BY business_name ASC, recipient_name ASC';
    const { results } = await db.prepare(query).all();
    
    return NextResponse.json(results || []);
  } catch (error: any) {
    console.error('収益分配取得エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 収益分配追加
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const data = await request.json();
    
    const result = await db.prepare(`
      INSERT INTO revenue_distributions 
        (business_name, model_name, recipient_name, distribution_type, value, memo)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      data.businessName,
      data.modelName || '',
      data.recipientName,
      data.distributionType,
      data.value,
      data.memo || ''
    ).run();
    
    return NextResponse.json({ 
      id: result.meta?.last_row_id,
      ...data
    });
  } catch (error: any) {
    console.error('収益分配追加エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 収益分配更新
export async function PUT(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const data = await request.json();
    
    await db.prepare(`
      UPDATE revenue_distributions SET 
        business_name = ?, model_name = ?, recipient_name = ?,
        distribution_type = ?, value = ?, memo = ?, updated_at = datetime("now")
      WHERE id = ?
    `).bind(
      data.businessName,
      data.modelName || '',
      data.recipientName,
      data.distributionType,
      data.value,
      data.memo || '',
      data.id
    ).run();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('収益分配更新エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 収益分配削除
export async function DELETE(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await db.prepare('DELETE FROM revenue_distributions WHERE id = ?').bind(id).run();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('収益分配削除エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

