import { NextResponse } from 'next/server';
import { generateCsvReport } from '@/lib/reports/reportGenerator';

export async function GET() {
  try {
    const csv = generateCsvReport(null);
    const filename = `export_report_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
