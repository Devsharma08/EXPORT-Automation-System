import { SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE, BLOCKLISTED_DOMAINS, IMAGE_EXTENSIONS } from '@/lib/config';
import type { BuyerRecord } from '@/types';
import { fetchWithScrapingBee, searchGoogleApi } from '@/lib/search/scrapingBee';
import { decodeCloudflareEmail, decodeHtmlEntities, unobfuscateEmailText } from '@/lib/extraction/dataExtractor';

const QUERY_TEMPLATES = [
  '"{keyword}" (importer OR "wholesale buyer" OR distributor OR buyer) ("contact us" OR email)',
  '"{keyword}" wholesale company contact email',
  '"{keyword}" bulk buyer email info',
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const CF_PATTERN = /data-cfemail=["']([a-f0-9]+)["']/gi;
const MAILTO_PATTERN = /href=["']mailto:([^"'?]+)["']/gi;

function isBlocked(url: string): boolean {
  for (const domain of BLOCKLISTED_DOMAINS) {
    if (url.includes(domain)) return true;
  }
  return false;
}

function extractEmailsFromText(text: string): string[] {
  const decodedHtml = decodeHtmlEntities(text);
  const unobfuscated = unobfuscateEmailText(decodedHtml);
  
  const found = new Set<string>();

  // 1. Check direct regex
  const candidates = unobfuscated.match(EMAIL_PATTERN) ?? [];
  for (const e of candidates) {
    const lower = e.toLowerCase();
    const domain = lower.split('@').pop() ?? '';
    const ext = domain.split('.').pop() ?? '';
    if (IMAGE_EXTENSIONS.has('.' + ext) || domain.length > 50) continue;
    found.add(lower);
  }

  // 2. Check Cloudflare data-cfemail
  let cfMatch;
  while ((cfMatch = CF_PATTERN.exec(text)) !== null) {
    const decoded = decodeCloudflareEmail(cfMatch[1]);
    if (decoded && decoded.includes('@')) {
      found.add(decoded.toLowerCase());
    }
  }

  // 3. Check mailto:
  let mailtoMatch;
  while ((mailtoMatch = MAILTO_PATTERN.exec(text)) !== null) {
    const email = mailtoMatch[1].trim().toLowerCase();
    if (email && email.includes('@')) {
      found.add(email);
    }
  }

  return Array.from(found);
}

async function visitAndExtract(result: {
  title: string;
  url: string;
  snippet: string;
}): Promise<Partial<BuyerRecord> | null> {
  const record: Partial<BuyerRecord> = {
    buyer_name: result.title,
    company_name: result.title,
    email: '',
    website: result.url,
    country: '',
    source_platform: 'Google',
    discovered_at: new Date().toISOString(),
  };

  const urlsToTry = [result.url];
  try {
    const parsed = new URL(result.url);
    urlsToTry.push(new URL('/contact', parsed.origin).toString());
    urlsToTry.push(new URL('/contact-us', parsed.origin).toString());
  } catch {
    // ignore URL parsing error
  }

  for (const u of urlsToTry) {
    try {
      const resp = await fetchWithScrapingBee(u, false, 8000);
      if (!resp.ok) continue;
      const text = await resp.text();
      const emails = extractEmailsFromText(text);
      if (emails.length) {
        record.email = emails[0];
        return record;
      }
    } catch {
      // try next path
    }
  }

  return null;
}

export async function search(
  keyword = SEARCH_KEYWORD,
  maxResults = MAX_RESULTS_PER_SOURCE
): Promise<Partial<BuyerRecord>[]> {
  const allRecords: Partial<BuyerRecord>[] = [];
  const seenUrls = new Set<string>();

  for (const template of QUERY_TEMPLATES) {
    const query = template.replace('{keyword}', keyword);
    const results = await searchGoogleApi(query, maxResults);

    for (const r of results) {
      if (!r.url || isBlocked(r.url) || seenUrls.has(r.url)) continue;
      seenUrls.add(r.url);
      
      // Quick snippet check
      const snippetEmails = extractEmailsFromText(r.snippet);
      if (snippetEmails.length) {
        allRecords.push({
          buyer_name: r.title,
          company_name: r.title,
          email: snippetEmails[0],
          website: r.url,
          country: '',
          source_platform: 'Google',
          discovered_at: new Date().toISOString(),
        });
        continue;
      }

      const record = await visitAndExtract(r);
      if (record && record.email) allRecords.push(record);
      if (allRecords.length >= maxResults) break;
    }

    if (allRecords.length >= maxResults) break;
  }

  return allRecords.slice(0, maxResults);
}
