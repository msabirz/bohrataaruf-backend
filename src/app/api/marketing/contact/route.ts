import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contactMessages } from '@/lib/db/schema';
import { z } from 'zod';

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
  // userId is optionally passed by the mobile client (logged-in users)
  userId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ContactSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    await db.insert(contactMessages).values({
      userId: data.userId ?? null,
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact submit error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
