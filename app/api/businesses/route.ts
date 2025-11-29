import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// GET: 全事業取得
export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const { results } = await db.prepare(
      'SELECT * FROM businesses ORDER BY name ASC'
    ).all();
    
    return NextResponse.json(results || []);
  } catch (error: any) {
    console.error('事業データ取得エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 事業追加
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { name, memo } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: '事業名は必須です' }, { status: 400 });
    }
    
    const result = await db.prepare(
      'INSERT INTO businesses (name, memo) VALUES (?, ?)'
    ).bind(name, memo || '').run();
    
    return NextResponse.json({ 
      id: result.meta?.last_row_id,
      name,
      memo: memo || ''
    });
  } catch (error: any) {
    console.error('事業追加エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 事業更新
export async function PUT(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { id, name, memo } = await request.json();
    
    if (!id || !name) {
      return NextResponse.json({ error: 'IDと事業名は必須です' }, { status: 400 });
    }
    
    await db.prepare(
      'UPDATE businesses SET name = ?, memo = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(name, memo || '', id).run();
    
    return NextResponse.json({ id, name, memo });
  } catch (error: any) {
    console.error('事業更新エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 事業削除
export async function DELETE(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 });
    }
    
    await db.prepare('DELETE FROM businesses WHERE id = ?').bind(id).run();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('事業削除エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

