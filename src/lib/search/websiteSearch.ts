import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE, BLOCKLISTED_DOMAINS } from '@/lib/config';
import type { BuyerRecord } from '@/types';
import { fetchWithScrapingBee, searchGoogleApi } from '@/lib/search/scrapingBee';

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const WEBSITE_QUERIES = [
  '"{keyword}" importer wholesale "contact us" email',
  '"{keyword}" import company "info@" OR "sales@"',
];

function isBlocked(url: string): boolean {
  for (const domain of BLOCKLISTED_DOMAINS) {
    if (url.includes(domain)) return true;
  }
  return false;
}

async function visitContactPage(baseUrl: string): Promise<string[]> {
  const contactPaths = ['/contact', '/contact-us', '/'];
  for (const p of contactPaths) {
    try {
      const url = new URL(p, baseUrl).toString();
      const resp = await fetchWithScrapingBee(url, false, 8000);
      const html = await resp.text();
      const emails = html.match(EMAIL_PATTERN) ?? [];
      if (emails.length) return emails.map((e) => e.toLowerCase());
    } catch {
      // try next path
    }
  }
  return [];
}

export async function search(
  keyword = SEARCH_KEYWORD,
  maxResults = MAX_RESULTS_PER_SOURCE
): Promise<Partial<BuyerRecord>[]> {
  const results: Partial<BuyerRecord>[] = [];
  const seenUrls = new Set<string>();

  for (const template of WEBSITE_QUERIES) {
    const query = template.replace('{keyword}', keyword);
    const searchResults = await searchGoogleApi(query, maxResults);
    
    const pagePromises: Promise<void>[] = [];

    for (const res of searchResults) {
      const title = res.title;
      const href = res.url;
      const snippet = res.snippet;

      if (!href || !href.startsWith('http') || isBlocked(href) || seenUrls.has(href)) continue;
      seenUrls.add(href);

      // First check snippet for emails
      const snippetEmails = (snippet.match(EMAIL_PATTERN) ?? []).map((e) => e.toLowerCase());
      if (snippetEmails.length) {
        results.push({
          buyer_name: title,
          company_name: title,
          email: snippetEmails[0],
          website: href,
          country: '',
          source_platform: 'Website',
          discovered_at: new Date().toISOString(),
        });
        continue;
      }

      // Otherwise, visit the site
      const p = visitContactPage(href).then((emails) => {
        if (emails.length) {
          results.push({
            buyer_name: title,
            company_name: title,
            email: emails[0],
            website: href,
            country: '',
            source_platform: 'Website',
            discovered_at: new Date().toISOString(),
          });
        }
      });
      pagePromises.push(p);
    }

    await Promise.allSettled(pagePromises);
    if (results.length >= maxResults) break;
  }

  return results.slice(0, maxResults);
}
