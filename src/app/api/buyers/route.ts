import { NextRequest, NextResponse } from 'next/server';
import { readBuyers, readBuyersWithStatus, deleteBuyer } from '@/lib/data/activityLogger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '0', 10);
    const withStatus = searchParams.get('status') !== 'false';

    let buyers = withStatus ? readBuyersWithStatus() : readBuyers();
    const total = buyers.length;

    if (limit > 0) {
      buyers = buyers.slice(-limit).reverse();
    }

    return NextResponse.json({ buyers, total });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required.' }, { status: 400 });
    }
    const success = deleteBuyer(email);
    if (!success) {
      return NextResponse.json({ error: 'Buyer not found or failed to delete.' }, { status: 404 });
    }
    return NextResponse.json({ message: `Buyer ${email} removed successfully.` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
