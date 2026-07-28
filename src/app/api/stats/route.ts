import { NextResponse } from 'next/server';
import { getDatabaseStats } from '@/lib/data/activityLogger';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const stats = getDatabaseStats();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
