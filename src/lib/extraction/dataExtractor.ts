/**
 * dataExtractor.ts — Normalizes raw search adapter results.
 * Port of extraction/data_extractor.py
 */

import type { BuyerRecord } from '@/types';

export function extract(rawRecords: Partial<BuyerRecord>[]): BuyerRecord[] {
  const seen = new Set<string>();
  const normalized: BuyerRecord[] = [];

  for (const r of rawRecords) {
    const email = (r.email ?? '').toLowerCase().trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);

    normalized.push({
      buyer_name: r.buyer_name ?? '',
      company_name: r.company_name ?? '',
      email,
      website: r.website ?? '',
      country: r.country ?? '',
      source_platform: r.source_platform ?? '',
      discovered_at: r.discovered_at ?? new Date().toISOString(),
    });
  }

  return normalized;
}
