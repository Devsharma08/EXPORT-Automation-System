import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readBuyers } from '@/lib/data/activityLogger';
import { validateEmail } from '@/lib/validation/emailValidator';
import { BUYERS_CSV, BUYERS_COLUMNS } from '@/lib/config';
import { stringify } from 'csv-stringify/sync';

export const dynamic = 'force-dynamic';

interface ValidationRun {
  running: boolean;
  log: string[];
  result?: {
    valid_count: number;
    removed_count: number;
    removed: Array<{ email: string; reason: string }>;
  };
}

// In-memory state (per-process)
const state: ValidationRun = { running: false, log: [] };

export async function GET() {
  return NextResponse.json(state);
}

export async function POST() {
  if (state.running) {
    return NextResponse.json({ error: 'Validation already running.' }, { status: 409 });
  }

  state.running = true;
  state.log = ['[validate] Starting email validation scan…'];
  state.result = undefined;

  // Run async so the response returns immediately
  (async () => {
    try {
      const buyers = readBuyers();
      state.log.push(`[validate] Loaded ${buyers.length} buyer records`);

      const valid = [];
      const removed: Array<{ email: string; reason: string }> = [];

      for (const record of buyers) {
        const { valid: isValid, reason } = validateEmail(record.email ?? '');
        if (isValid) {
          valid.push(record);
        } else {
          removed.push({ email: record.email ?? '', reason });
          state.log.push(`[validate] ✗ Removed: ${record.email} — ${reason}`);
        }
      }

      // Rewrite buyers.csv with only valid records
      const dir = path.dirname(BUYERS_CSV);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const csv = stringify(valid.map((r) => {
        const row: Record<string, string> = {};
        for (const col of BUYERS_COLUMNS) {
          row[col] = (r as unknown as Record<string, string | undefined>)[col] ?? '';
        }
        return row;
      }), { header: true, columns: [...BUYERS_COLUMNS] });
      fs.writeFileSync(BUYERS_CSV, csv, 'utf-8');

      state.log.push(`[validate] ✓ Done — ${valid.length} valid, ${removed.length} removed`);
      state.result = {
        valid_count: valid.length,
        removed_count: removed.length,
        removed,
      };
    } catch (err) {
      state.log.push(`[validate] ERROR: ${String(err)}`);
    } finally {
      state.running = false;
    }
  })();

  return NextResponse.json({ message: 'Validation started.' });
}
