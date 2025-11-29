import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// GET: 資産一覧取得
export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const { results } = await db.prepare(
      'SELECT * FROM assets ORDER BY name ASC'
    ).all();
    
    return NextResponse.json(results || []);
  } catch (error: any) {
    console.error('資産取得エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 資産追加
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const data = await request.json();
    
    const result = await db.prepare(`
      INSERT INTO assets (asset_type, name, affiliation, current_balance, currency, update_date, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.assetType,
      data.name,
      data.affiliation || '',
      data.currentBalance || 0,
      data.currency || 'JPY',
      data.updateDate || null,
      data.memo || ''
    ).run();
    
    return NextResponse.json({ 
      id: result.meta?.last_row_id,
      ...data
    });
  } catch (error: any) {
    console.error('資産追加エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 資産更新
export async function PUT(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const data = await request.json();
    
    await db.prepare(`
      UPDATE assets SET 
        asset_type = ?, name = ?, affiliation = ?, current_balance = ?,
        currency = ?, update_date = ?, memo = ?, updated_at = datetime("now")
      WHERE id = ?
    `).bind(
      data.assetType,
      data.name,
      data.affiliation || '',
      data.currentBalance || 0,
      data.currency || 'JPY',
      data.updateDate || null,
      data.memo || '',
      data.id
    ).run();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('資産更新エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 資産削除
export async function DELETE(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await db.prepare('DELETE FROM assets WHERE id = ?').bind(id).run();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('資産削除エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

