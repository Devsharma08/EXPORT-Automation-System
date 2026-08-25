import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE } from '@/lib/config';
import type { BuyerRecord } from '@/types';
import { searchGoogleApi } from '@/lib/search/scrapingBee';
import { unobfuscateEmailText, decodeHtmlEntities } from '@/lib/extraction/dataExtractor';

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const FB_QUERIES = [
  'site:facebook.com "{keyword}" (importer OR buyer OR wholesale) ("@gmail.com" OR "@yahoo.com" OR "@outlook.com")',
  'site:facebook.com "{keyword}" company email contact wholesale buyer',
  'site:facebook.com "{keyword}" "home decor" OR "gift shop" importer email',
  'site:facebook.com "{keyword}" distributor "contact" email address',
  '"{keyword}" importer buyer site:facebook.com email OR contact',
  '"{keyword}" wholesale candle holder buyer site:facebook.com email',
];

function extractAllEmails(text: string): string[] {
  const decoded = decodeHtmlEntities(unobfuscateEmailText(text));
  const matches = decoded.match(EMAIL_PATTERN) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of matches) {
    const low = e.toLowerCase();
    if (!seen.has(low)) { seen.add(low); result.push(low); }
  }
  return result;
}

export async function search(
  keyword = SEARCH_KEYWORD,
  maxResults = MAX_RESULTS_PER_SOURCE
): Promise<Partial<BuyerRecord>[]> {
  const results: Partial<BuyerRecord>[] = [];
  const seenEmails = new Set<string>();

  for (const template of FB_QUERIES) {
    if (results.length >= maxResults) break;
    const query = template.replace('{keyword}', keyword);
    const searchResults = await searchGoogleApi(query, maxResults);

    for (const res of searchResults) {
      if (results.length >= maxResults) break;
      const emails = extractAllEmails(res.snippet + ' ' + res.title);
      for (const email of emails) {
        if (results.length >= maxResults) break;
        if (!seenEmails.has(email)) {
          seenEmails.add(email);
          results.push({
            buyer_name: res.title,
            company_name: res.title.split('-')[0]?.trim() || res.title,
            email,
            website: res.url,
            country: '',
            source_platform: 'Facebook',
            discovered_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  return results.slice(0, maxResults);
}
