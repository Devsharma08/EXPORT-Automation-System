import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE } from '@/lib/config';
import type { BuyerRecord } from '@/types';
import { searchGoogleApi } from '@/lib/search/scrapingBee';
import { unobfuscateEmailText, decodeHtmlEntities } from '@/lib/extraction/dataExtractor';

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const LINKEDIN_QUERIES = [
  'site:linkedin.com/company/ "{keyword}" ("importer" OR "purchasing" OR "buyer") ("@gmail.com" OR "@yahoo.com" OR "contact")',
  'site:linkedin.com/in/ "{keyword}" ("buyer" OR "import manager" OR "category manager") ("@gmail.com" OR "@outlook.com" OR "email")',
];

export async function search(
  keyword = SEARCH_KEYWORD,
  maxResults = MAX_RESULTS_PER_SOURCE
): Promise<Partial<BuyerRecord>[]> {
  const results: Partial<BuyerRecord>[] = [];
  const seenEmails = new Set<string>();

  for (const template of LINKEDIN_QUERIES) {
    const query = template.replace('{keyword}', keyword);
    const searchResults = await searchGoogleApi(query, maxResults);

    for (const res of searchResults) {
      const title = res.title;
      const snippet = res.snippet;
      const href = res.url;

      const text = unobfuscateEmailText(decodeHtmlEntities(snippet + ' ' + title));
      const emails = (text.match(EMAIL_PATTERN) ?? []).map((e) => e.toLowerCase());
      
      if (emails.length && href && !seenEmails.has(emails[0])) {
        seenEmails.add(emails[0]);
        results.push({
          buyer_name: title.split('|')[0]?.trim() || title,
          company_name: title,
          email: emails[0],
          website: href,
          country: '',
          source_platform: 'LinkedIn',
          discovered_at: new Date().toISOString(),
        });
      }
    }

    if (results.length >= maxResults) break;
  }

  return results.slice(0, maxResults);
}
