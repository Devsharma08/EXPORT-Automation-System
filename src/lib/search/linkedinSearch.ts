import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE } from '@/lib/config';
import type { BuyerRecord } from '@/types';
import { searchGoogleApi } from '@/lib/search/scrapingBee';

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

export async function search(
  keyword = SEARCH_KEYWORD,
  maxResults = MAX_RESULTS_PER_SOURCE
): Promise<Partial<BuyerRecord>[]> {
  const results: Partial<BuyerRecord>[] = [];
  const query = `site:linkedin.com "${keyword}" ("@gmail.com" OR "@yahoo.com" OR "@hotmail.com" OR "contact")`;
  const searchResults = await searchGoogleApi(query, maxResults);

  for (const res of searchResults) {
    const title = res.title;
    const snippet = res.snippet;
    const href = res.url;
    const emails = (snippet.match(EMAIL_PATTERN) ?? []).map((e) => e.toLowerCase());
    
    if (emails.length && href) {
      results.push({
        buyer_name: title,
        company_name: title,
        email: emails[0],
        website: href,
        country: '',
        source_platform: 'LinkedIn',
        discovered_at: new Date().toISOString(),
      });
    }
  }
  return results;
}
