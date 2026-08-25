import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE } from '@/lib/config';
import type { BuyerRecord } from '@/types';
import { searchGoogleApi } from '@/lib/search/scrapingBee';
import { unobfuscateEmailText, decodeHtmlEntities } from '@/lib/extraction/dataExtractor';

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const LINKEDIN_QUERIES = [
  'site:linkedin.com/company "{keyword}" (importer OR buyer OR wholesale OR purchasing) "@gmail.com" OR "@yahoo.com" OR "@outlook.com"',
  'site:linkedin.com/company "{keyword}" (importer OR distributor OR "category manager") email contact',
  'site:linkedin.com/in "{keyword}" (buyer OR "import manager" OR "purchasing manager") "@gmail.com" OR "@outlook.com"',
  'site:linkedin.com "{keyword}" wholesale company "contact email" OR "email us"',
  '"{keyword}" importer site:linkedin.com company email address',
  '"{keyword}" buyer site:linkedin.com "email" OR "contact" wholesale',
  'site:linkedin.com/company "{keyword}" decor importer email',
  'site:linkedin.com "{keyword}" "bulk order" OR "wholesale" buyer email contact',
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

  for (const template of LINKEDIN_QUERIES) {
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
            buyer_name: res.title.split('|')[0]?.trim() || res.title,
            company_name: res.title,
            email,
            website: res.url,
            country: '',
            source_platform: 'LinkedIn',
            discovered_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  return results.slice(0, maxResults);
}
