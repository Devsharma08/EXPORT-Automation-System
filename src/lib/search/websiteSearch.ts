/**
 * websiteSearch.ts — Company website source adapter.
 * Port of search/website_search.py
 * Searches for company websites and extracts contact emails.
 */

import * as cheerio from 'cheerio';
import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE, BLOCKLISTED_DOMAINS } from '@/lib/config';
import type { BuyerRecord } from '@/types';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const WEBSITE_QUERIES = [
  '"{keyword}" importer wholesale "contact us" email',
  '"{keyword}" buyer company email site:alibaba.com',
  '"{keyword}" import company "info@" OR "sales@" OR "contact@"',
];

function isBlocked(url: string): boolean {
  for (const domain of BLOCKLISTED_DOMAINS) {
    if (url.includes(domain)) return true;
  }
  return false;
}

async function visitContactPage(baseUrl: string): Promise<string[]> {
  const contactPaths = ['/contact', '/contact-us', '/about', '/'];
  for (const p of contactPaths) {
    try {
      const url = new URL(p, baseUrl).toString();
      const resp = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(6000) });
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
    try {
      const query = template.replace('{keyword}', keyword);
      const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10`;
      const resp = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
      const html = await resp.text();
      const $ = cheerio.load(html);

      const pagePromises: Promise<void>[] = [];

      $('li.b_algo').each((_, el) => {
        const title = $(el).find('h2').text().trim();
        const href = $(el).find('a').attr('href') ?? '';
        const snippet = $(el).find('.b_caption p').text().trim();

        if (!href.startsWith('http') || isBlocked(href) || seenUrls.has(href)) return;
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
          return;
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
      });

      await Promise.allSettled(pagePromises);
    } catch {
      // best effort
    }

    if (results.length >= maxResults) break;
  }

  return results.slice(0, maxResults);
}
