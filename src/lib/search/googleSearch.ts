import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE, BLOCKLISTED_DOMAINS, IMAGE_EXTENSIONS } from '@/lib/config';
import type { BuyerRecord } from '@/types';
import { fetchWithScrapingBee, searchGoogleApi } from '@/lib/search/scrapingBee';

const QUERY_TEMPLATES = [
  '{keyword} importer',
  '{keyword} wholesale buyer',
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function isBlocked(url: string): boolean {
  for (const domain of BLOCKLISTED_DOMAINS) {
    if (url.includes(domain)) return true;
  }
  return false;
}

function extractEmailsFromText(text: string): string[] {
  const candidates = text.match(EMAIL_PATTERN) ?? [];
  const valid: string[] = [];
  const seen = new Set<string>();
  for (const e of candidates) {
    const lower = e.toLowerCase();
    if (seen.has(lower)) continue;
    const ext = '.' + lower.split('@')[1]?.split('.').pop();
    if (IMAGE_EXTENSIONS.has(ext)) continue;
    const domain = lower.split('@').pop() ?? '';
    if (domain.length > 50) continue;
    seen.add(lower);
    valid.push(lower);
  }
  return valid;
}

async function visitAndExtract(result: {
  title: string;
  url: string;
  snippet: string;
}): Promise<Partial<BuyerRecord>> {
  const record: Partial<BuyerRecord> = {
    buyer_name: result.title,
    company_name: result.title,
    email: '',
    website: result.url,
    country: '',
    source_platform: 'Google',
    discovered_at: new Date().toISOString(),
  };
  try {
    const resp = await fetchWithScrapingBee(result.url, false, 8000);
    const text = await resp.text();
    const emails = [
      ...extractEmailsFromText(text),
      ...extractEmailsFromText(result.snippet),
    ];
    if (emails.length) record.email = emails[0];
  } catch {
    // ignore visit failures
  }
  return record;
}

export async function search(
  keyword = SEARCH_KEYWORD,
  maxResults = MAX_RESULTS_PER_SOURCE
): Promise<Partial<BuyerRecord>[]> {
  const allRecords: Partial<BuyerRecord>[] = [];
  const seenUrls = new Set<string>();

  for (const template of QUERY_TEMPLATES) {
    const query = template.replace('{keyword}', keyword);
    const results = await searchGoogleApi(query, maxResults);

    for (const r of results) {
      if (!r.url || isBlocked(r.url) || seenUrls.has(r.url)) continue;
      seenUrls.add(r.url);
      
      // Quick snippet check
      const snippetEmails = extractEmailsFromText(r.snippet);
      if (snippetEmails.length) {
        allRecords.push({
          buyer_name: r.title,
          company_name: r.title,
          email: snippetEmails[0],
          website: r.url,
          country: '',
          source_platform: 'Google',
          discovered_at: new Date().toISOString(),
        });
        continue;
      }

      const record = await visitAndExtract(r);
      if (record.email) allRecords.push(record);
    }

    if (allRecords.length >= maxResults) break;
  }

  return allRecords.slice(0, maxResults);
}
