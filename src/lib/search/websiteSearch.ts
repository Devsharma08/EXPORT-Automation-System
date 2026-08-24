import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE, BLOCKLISTED_DOMAINS } from '@/lib/config';
import type { BuyerRecord } from '@/types';
import { fetchWithScrapingBee, searchGoogleApi } from '@/lib/search/scrapingBee';
import { unobfuscateEmailText, decodeHtmlEntities, decodeCloudflareEmail } from '@/lib/extraction/dataExtractor';

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const WEBSITE_QUERIES = [
  '"{keyword}" importer wholesale "contact us" email',
  '"{keyword}" import company "info@" OR "sales@"',
  '"{keyword}" distributor "email us" contact',
];

function isBlocked(url: string): boolean {
  for (const domain of BLOCKLISTED_DOMAINS) {
    if (url.includes(domain)) return true;
  }
  return false;
}

async function visitContactPage(baseUrl: string): Promise<string[]> {
  const contactPaths = ['/contact', '/contact-us', '/about-us', '/about', '/impressum', '/'];
  const foundEmails = new Set<string>();

  for (const p of contactPaths) {
    try {
      const url = new URL(p, baseUrl).toString();
      const resp = await fetchWithScrapingBee(url, false, 8000);
      if (!resp.ok) continue;

      const html = await resp.text();
      const decodedHtml = decodeHtmlEntities(html);
      const text = unobfuscateEmailText(decodedHtml);

      const matches = text.match(EMAIL_PATTERN) ?? [];
      for (const m of matches) {
        foundEmails.add(m.toLowerCase());
      }

      // Check Cloudflare email protection data-cfemail
      const cfMatches = html.matchAll(/data-cfemail=["']([a-f0-9]+)["']/gi);
      for (const cf of cfMatches) {
        const decoded = decodeCloudflareEmail(cf[1]);
        if (decoded && decoded.includes('@')) {
          foundEmails.add(decoded.toLowerCase());
        }
      }

      if (foundEmails.size > 0) return Array.from(foundEmails);
    } catch {
      // try next path
    }
  }
  return Array.from(foundEmails);
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

      // Check snippet first
      const snippetText = unobfuscateEmailText(decodeHtmlEntities(snippet));
      const snippetEmails = (snippetText.match(EMAIL_PATTERN) ?? []).map((e) => e.toLowerCase());
      
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

      // Otherwise visit site contact pages
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
