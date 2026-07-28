/**
 * googleSearch.ts — Google source adapter.
 * Port of search/google_search.py
 * Uses fetch + cheerio instead of requests + BeautifulSoup.
 */

import * as cheerio from 'cheerio';
import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE, BLOCKLISTED_DOMAINS, IMAGE_EXTENSIONS } from '@/lib/config';
import type { BuyerRecord } from '@/types';

const QUERY_TEMPLATES = [
  '{keyword} importer',
  '{keyword} wholesale buyer',
  '{keyword} import company email',
  '{keyword} distributor contact',
  'buy {keyword} wholesale',
  '{keyword} supplier wanted',
];

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

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

async function scrapeGoogleResults(
  query: string,
  maxResults: number
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}`;
    const resp = await fetch(url, { headers: HEADERS });
    const html = await resp.text();
    const $ = cheerio.load(html);

    $('div.g').each((_, el) => {
      const title = $(el).find('h3').first().text().trim();
      let href = $(el).find('a[href]').first().attr('href') ?? '';
      const snippet = $(el).find('div.VwiC3b, span.st').first().text().trim();

      if (href.startsWith('/url?q=')) href = href.split('/url?q=')[1].split('&')[0];
      if (href.startsWith('http') && !isBlocked(href)) {
        results.push({ title, url: href, snippet });
      }
      if (results.length >= maxResults) return false;
    });
  } catch {
    // best effort
  }
  return results;
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
    const resp = await fetch(result.url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
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
    const results = await scrapeGoogleResults(query, 5);

    for (const r of results) {
      if (seenUrls.has(r.url)) continue;
      seenUrls.add(r.url);
      const record = await visitAndExtract(r);
      if (record.email) allRecords.push(record);
    }

    if (allRecords.length >= maxResults) break;
  }

  return allRecords.slice(0, maxResults);
}
