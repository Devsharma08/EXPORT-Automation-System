import { NextRequest, NextResponse } from 'next/server';
import { readBuyers } from '@/lib/data/activityLogger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '0', 10);
    let buyers = readBuyers();
    if (limit > 0) buyers = buyers.slice(-limit).reverse();
    return NextResponse.json({ buyers, total: buyers.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
