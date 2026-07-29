import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status') || ''; 
    const readFilter = url.searchParams.get('read') || ''; 

    let baseFilter = sql`1=1`;

    if (statusFilter) {
      baseFilter = sql`${baseFilter} AND c.status = ${statusFilter}`;
    }

    if (readFilter === 'true') {
      baseFilter = sql`${baseFilter} AND c.is_read = true`;
    } else if (readFilter === 'false') {
      baseFilter = sql`${baseFilter} AND c.is_read = false`;
    }

    const rawData: any = await db.execute(sql`
      SELECT 
        c.id, c.user_id as "userId", c.name, c.email, c.subject, c.message,
        c.is_read as "isRead", c.status,
        c.admin_reply_text as "adminReplyText", c.replied_at as "repliedAt",
        c.created_at as "createdAt",
        v.name as "handledByName"
      FROM contact_messages c
      LEFT JOIN volunteers v ON c.handled_by = v.id
      WHERE ${baseFilter}
      ORDER BY c.created_at DESC
      LIMIT 100
    `);

    const messagesData = Array.isArray(rawData) ? rawData : (rawData.rows || []);
    return NextResponse.json({ messages: messagesData });
  } catch (error) {
    console.error('[Admin Messages API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
