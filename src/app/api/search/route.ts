import { NextRequest, NextResponse } from 'next/server';
import { appendBuyers } from '@/lib/data/activityLogger';
import { extract } from '@/lib/extraction/dataExtractor';
import { validateRecords } from '@/lib/validation/emailValidator';

// In-memory search state (equivalent to Python's threading module globals)
export let searchRunning = false;
export let searchLog: string[] = [];

export async function POST(request: NextRequest) {
  if (searchRunning) {
    return NextResponse.json({ error: 'A search is already running. Please wait.' }, { status: 409 });
  }

  const body = await request.json().catch(() => ({})) as { keyword?: string };
  const keyword = (body.keyword ?? 'Singing Bowls').trim();

  // Run asynchronously in the background (non-blocking)
  searchRunning = true;
  searchLog = [];

  setImmediate(async () => {
    const { search: googleSearch } = await import('@/lib/search/googleSearch');
    const { search: facebookSearch } = await import('@/lib/search/facebookSearch');
    const { search: linkedinSearch } = await import('@/lib/search/linkedinSearch');
    const { search: directorySearch } = await import('@/lib/search/directorySearch');
    const { search: websiteSearch } = await import('@/lib/search/websiteSearch');

    const adapters: [string, (keyword: string) => Promise<unknown[]>][] = [
      ['Google', googleSearch],
      ['Facebook', facebookSearch],
      ['LinkedIn', linkedinSearch],
      ['Directory', directorySearch],
      ['Website', websiteSearch],
    ];

    const allRaw: unknown[] = [];
    for (const [name, adapter] of adapters) {
      try {
        const records = await adapter(keyword);
        allRaw.push(...records);
        searchLog.push(`✓ ${name}: ${records.length} records`);
      } catch (err) {
        searchLog.push(`✗ ${name}: ${String(err)}`);
      }
    }

    const normalized = extract(allRaw as never[]);
    const { valid } = validateRecords(normalized);
    const added = appendBuyers(valid);
    searchLog.push(`✓ Done: ${added} new buyers added to database.`);
    searchRunning = false;
  });

  return NextResponse.json({
    message: `Search started for '${keyword}'. This may take a few minutes.`,
  });
}
