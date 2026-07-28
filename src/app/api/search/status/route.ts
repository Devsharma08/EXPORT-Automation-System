import { NextResponse } from 'next/server';
import { searchRunning, searchLog } from '@/app/api/search/route';

export async function GET() {
  return NextResponse.json({ running: searchRunning, log: searchLog });
}
