/**
 * directorySearch.ts — Business directory source adapter.
 * Port of search/directory_search.py
 * Scrapes B2B directories (Kompass, ExportHub, etc.) for buyer contacts.
 */

import * as cheerio from 'cheerio';
import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE } from '@/lib/config';
import type { BuyerRecord } from '@/types';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const DIRECTORY_QUERIES = [
  '{keyword} importer directory contact email',
  '{keyword} wholesale buyer B2B email',
  '{keyword} trade directory site:kompass.com OR site:exporthub.com OR site:tradekey.com',
];

async function scrapeDirectory(query: string): Promise<Partial<BuyerRecord>[]> {
  const results: Partial<BuyerRecord>[] = [];
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10`;
    const resp = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    const html = await resp.text();
    const $ = cheerio.load(html);

    $('li.b_algo').each((_, el) => {
      const title = $(el).find('h2').text().trim();
      const snippet = $(el).find('.b_caption p').text().trim();
      const href = $(el).find('a').attr('href') ?? '';
      const emails = (snippet.match(EMAIL_PATTERN) ?? []).map((e) => e.toLowerCase());
      if (emails.length && href) {
        results.push({
          buyer_name: title,
          company_name: title,
          email: emails[0],
          website: href,
          country: '',
          source_platform: 'Directory',
          discovered_at: new Date().toISOString(),
        });
      }
    });
  } catch {
    // best effort
  }
  return results;
}

export async function search(
  keyword = SEARCH_KEYWORD,
  maxResults = MAX_RESULTS_PER_SOURCE
): Promise<Partial<BuyerRecord>[]> {
  const allResults: Partial<BuyerRecord>[] = [];
  for (const template of DIRECTORY_QUERIES) {
    const query = template.replace('{keyword}', keyword);
    const results = await scrapeDirectory(query);
    allResults.push(...results);
    if (allResults.length >= maxResults) break;
  }
  return allResults.slice(0, maxResults);
}
