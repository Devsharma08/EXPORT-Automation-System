import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE } from '@/lib/config';
import type { BuyerRecord } from '@/types';
import { searchGoogleApi, fetchWithScrapingBee } from '@/lib/search/scrapingBee';
import { unobfuscateEmailText, decodeHtmlEntities, decodeCloudflareEmail } from '@/lib/extraction/dataExtractor';

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const DIRECTORY_QUERIES = [
  '"{keyword}" importer directory ("@gmail.com" OR "@yahoo.com" OR "email")',
  '"{keyword}" buyer directory (site:kompass.com OR site:exporthub.com OR site:thomasnet.com OR site:europages.com)',
  '"{keyword}" B2B buyer trade directory contact',
];

export async function search(
  keyword = SEARCH_KEYWORD,
  maxResults = MAX_RESULTS_PER_SOURCE
): Promise<Partial<BuyerRecord>[]> {
  const results: Partial<BuyerRecord>[] = [];
  const seenEmails = new Set<string>();

  for (const template of DIRECTORY_QUERIES) {
    const query = template.replace('{keyword}', keyword);
    const searchResults = await searchGoogleApi(query, maxResults);

    for (const res of searchResults) {
      const title = res.title;
      const snippet = res.snippet;
      const href = res.url;

      const text = unobfuscateEmailText(decodeHtmlEntities(snippet + ' ' + title));
      let emails = (text.match(EMAIL_PATTERN) ?? []).map((e) => e.toLowerCase());

      // If snippet had no emails, try fetching page content
      if (emails.length === 0 && href && href.startsWith('http')) {
        try {
          const resp = await fetchWithScrapingBee(href, false, 7000);
          if (resp.ok) {
            const pageText = await resp.text();
            const decodedPage = unobfuscateEmailText(decodeHtmlEntities(pageText));
            emails = (decodedPage.match(EMAIL_PATTERN) ?? []).map((e) => e.toLowerCase());
          }
        } catch {
          // ignore page fetch failure
        }
      }

      if (emails.length && href && !seenEmails.has(emails[0])) {
        seenEmails.add(emails[0]);
        results.push({
          buyer_name: title.split('-')[0]?.trim() || title,
          company_name: title,
          email: emails[0],
          website: href,
          country: '',
          source_platform: 'Directory',
          discovered_at: new Date().toISOString(),
        });
      }
    }
    if (results.length >= maxResults) break;
  }
  
  return results.slice(0, maxResults);
}
