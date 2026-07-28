import { NextResponse } from 'next/server';
import { buildRunReport } from '@/lib/reports/reportGenerator';
import { readSentLog } from '@/lib/data/activityLogger';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const report = buildRunReport(null);
    const sentLog = readSentLog();
    const recentLog = sentLog.slice(-20).reverse();
    return NextResponse.json({ report, recent_log: recentLog });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
