/**
 * dataExtractor.ts — Normalizes raw search adapter results & extracts emails.
 * Supports Cloudflare data-cfemail decoding, text unobfuscation, and TLD country detection.
 */

import type { BuyerRecord } from '@/types';

// Cloudflare data-cfemail decoder
export function decodeCloudflareEmail(encodedString: string): string {
  try {
    let email = '';
    const r = parseInt(encodedString.substring(0, 2), 16);
    for (let n = 2; n < encodedString.length; n += 2) {
      const c = parseInt(encodedString.substring(n, n + 2), 16) ^ r;
      email += String.fromCharCode(c);
    }
    return email;
  } catch {
    return '';
  }
}

// Text unobfuscation: name [at] domain [dot] com -> name@domain.com
export function unobfuscateEmailText(text: string): string {
  return text
    .replace(/\s*[\(\[\{]\s*at\s*[\)\]\}]\s*/gi, '@')
    .replace(/\s*[\(\[\{]\s*dot\s*[\)\]\}]\s*/gi, '.')
    .replace(/\s+at\s+/gi, '@')
    .replace(/\s+dot\s+/gi, '.');
}

// HTML Entity decoder
export function decodeHtmlEntities(str: string): string {
  return str.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Country detection mapping based on domain TLDs
const TLD_COUNTRY_MAP: Record<string, string> = {
  uk: 'United Kingdom',
  'co.uk': 'United Kingdom',
  de: 'Germany',
  fr: 'France',
  in: 'India',
  'co.in': 'India',
  ae: 'United Arab Emirates',
  ca: 'Canada',
  au: 'Australia',
  'com.au': 'Australia',
  es: 'Spain',
  it: 'Italy',
  jp: 'Japan',
  'co.jp': 'Japan',
  cn: 'China',
  nl: 'Netherlands',
  ch: 'Switzerland',
  se: 'Sweden',
  sg: 'Singapore',
  br: 'Brazil',
  mx: 'Mexico',
  za: 'South Africa',
  nz: 'New Zealand',
  tr: 'Turkey',
  sa: 'Saudi Arabia',
  qa: 'Qatar',
  kw: 'Kuwait',
  om: 'Oman',
  eg: 'Egypt',
  pk: 'Pakistan',
  my: 'Malaysia',
  vn: 'Vietnam',
  th: 'Thailand',
  id: 'Indonesia',
  pl: 'Poland',
  be: 'Belgium',
  at: 'Austria',
  dk: 'Denmark',
  no: 'Norway',
  fi: 'Finland',
  ie: 'Ireland',
};

export function detectCountryFromUrl(urlStr: string): string {
  try {
    const hostname = new URL(urlStr).hostname.toLowerCase();
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const tld2 = parts.slice(-2).join('.');
      if (TLD_COUNTRY_MAP[tld2]) return TLD_COUNTRY_MAP[tld2];
      const tld1 = parts[parts.length - 1];
      if (TLD_COUNTRY_MAP[tld1]) return TLD_COUNTRY_MAP[tld1];
    }
  } catch {
    // Ignore invalid URLs
  }
  return '';
}

export function extract(rawRecords: Partial<BuyerRecord>[]): BuyerRecord[] {
  const seen = new Set<string>();
  const normalized: BuyerRecord[] = [];

  for (const r of rawRecords) {
    let email = (r.email ?? '').trim();
    
    // Attempt unobfuscation if needed
    if (!email.includes('@') && email) {
      email = unobfuscateEmailText(email);
    }
    
    email = email.toLowerCase().trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);

    const country = r.country || (r.website ? detectCountryFromUrl(r.website) : '');

    normalized.push({
      buyer_name: r.buyer_name ?? r.company_name ?? 'Export Buyer',
      company_name: r.company_name ?? r.buyer_name ?? 'Commercial Buyer',
      email,
      website: r.website ?? '',
      country,
      source_platform: r.source_platform ?? 'Web Search',
      discovered_at: r.discovered_at ?? new Date().toISOString(),
    });
  }

  return normalized;
}
