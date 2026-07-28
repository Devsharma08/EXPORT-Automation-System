import { NextRequest, NextResponse } from 'next/server';
import { appendBuyers } from '@/lib/data/activityLogger';
import { BUYERS_COLUMNS } from '@/lib/config';
import { parse } from 'csv-parse/sync';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are accepted.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const text = Buffer.from(buffer).toString('utf-8');

    const rows = parse(text, { columns: true, skip_empty_lines: true }) as Record<string, string>[];

    if (!rows.length) {
      return NextResponse.json({ error: 'CSV is empty.' }, { status: 400 });
    }

    // Flexible column mapping (port of Flask upload logic)
    const sampleRow = rows[0];
    const colMap: Record<string, string> = {};
    for (const col of Object.keys(sampleRow)) {
      const colLower = col.toLowerCase().replace(/ /g, '_');
      for (const schemaCol of BUYERS_COLUMNS) {
        if (
          colLower === schemaCol ||
          colLower.includes(schemaCol) ||
          schemaCol.includes(colLower)
        ) {
          colMap[col] = schemaCol;
          break;
        }
      }
    }

    const records = rows.map((row) => {
      const mapped: Record<string, string> = {};
      for (const [col, val] of Object.entries(row)) {
        const target = colMap[col];
        if (target) mapped[target] = val ?? '';
      }
      // Fill missing columns
      for (const col of BUYERS_COLUMNS) {
        if (!(col in mapped)) mapped[col] = '';
      }
      return mapped;
    });

    const added = appendBuyers(records);
    return NextResponse.json({ message: `Uploaded successfully! ${added} new buyers added.`, added });
  } catch (err) {
    return NextResponse.json({ error: `Error processing file: ${String(err)}` }, { status: 500 });
  }
}
