import { NextRequest, NextResponse } from 'next/server';
import { appendBuyers, clearBuyers } from '@/lib/data/activityLogger';
import { extract } from '@/lib/extraction/dataExtractor';
import { validateRecords } from '@/lib/validation/emailValidator';
import { loadSettings } from '@/lib/data/settingsHelper';

// In-memory search state
export let searchRunning = false;
export let searchLog: string[] = [];

export async function POST(request: NextRequest) {
  if (searchRunning) {
    return NextResponse.json({ error: 'A search is already running. Please wait.' }, { status: 409 });
  }

  const body = await request.json().catch(() => ({})) as { keyword?: string; platforms?: string[]; maxResults?: number };
  const keyword = (body.keyword ?? 'Crystal Candle Holders').trim();
  const selectedPlatforms = body.platforms ?? ['Google', 'Facebook', 'LinkedIn', 'Directory', 'Website'];
  const maxResults = body.maxResults ?? 20;

  // Sync latest settings from settings.json
  const settings = loadSettings();

  searchRunning = true;
  searchLog = [];
  
  // Clear previous search records as requested by user
  clearBuyers();

  const hasApiKey = Boolean(settings.serper_api_key || settings.scrapingbee_api_key || settings.tavily_api_key);
  if (!hasApiKey) {
    searchLog.push(`ℹ Native Scraper Engine active. Tip: Add a free Serper.dev or ScrapingBee API key in Settings for higher search yields.`);
  } else {
    searchLog.push(`✓ Search API Gateway active with configured provider key.`);
  }

  setImmediate(async () => {
    const { search: googleSearch } = await import('@/lib/search/googleSearch');
    const { search: facebookSearch } = await import('@/lib/search/facebookSearch');
    const { search: linkedinSearch } = await import('@/lib/search/linkedinSearch');
    const { search: directorySearch } = await import('@/lib/search/directorySearch');
    const { search: websiteSearch } = await import('@/lib/search/websiteSearch');

    const allAdapters: [string, (keyword: string, maxResults?: number) => Promise<unknown[]>][] = [
      ['Google', googleSearch],
      ['Facebook', facebookSearch],
      ['LinkedIn', linkedinSearch],
      ['Directory', directorySearch],
      ['Website', websiteSearch],
    ];

    const adapters = allAdapters.filter(([name]) => selectedPlatforms.includes(name));

    const allRaw: unknown[] = [];
    for (const [name, adapter] of adapters) {
      try {
        searchLog.push(`🔍 Searching ${name} for "${keyword}"...`);
        const records = await adapter(keyword, maxResults);
        allRaw.push(...records);
        searchLog.push(`✓ ${name}: Discovered ${records.length} potential buyer records`);
      } catch (err) {
        searchLog.push(`✗ ${name}: ${String(err)}`);
      }
    }

    const normalized = extract(allRaw as never[]);
    const { valid, invalid } = validateRecords(normalized);
    const added = appendBuyers(valid);

    if (invalid.length > 0) {
      searchLog.push(`ℹ Filtered ${invalid.length} invalid/false-positive email records.`);
    }

    searchLog.push(`✓ Search Complete: ${added} verified buyer emails saved to database.`);
    searchRunning = false;
  });

  return NextResponse.json({
    message: `Search started for '${keyword}'.`,
  });
}
