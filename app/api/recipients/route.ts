import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// GET: 分配先一覧取得
export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const { results } = await db.prepare(
      'SELECT * FROM recipients ORDER BY name ASC'
    ).all();
    
    return NextResponse.json(results || []);
  } catch (error: any) {
    console.error('分配先取得エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 分配先追加
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { name, memo } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: '分配先名は必須です' }, { status: 400 });
    }
    
    const result = await db.prepare(
      'INSERT INTO recipients (name, memo) VALUES (?, ?)'
    ).bind(name, memo || '').run();
    
    return NextResponse.json({ 
      id: result.meta?.last_row_id,
      name,
      memo: memo || ''
    });
  } catch (error: any) {
    console.error('分配先追加エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 分配先更新
export async function PUT(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { id, name, memo } = await request.json();
    
    await db.prepare(
      'UPDATE recipients SET name = ?, memo = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(name, memo || '', id).run();
    
    return NextResponse.json({ id, name, memo });
  } catch (error: any) {
    console.error('分配先更新エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 分配先削除
export async function DELETE(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await db.prepare('DELETE FROM recipients WHERE id = ?').bind(id).run();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('分配先削除エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

