/**
 * activityLogger.ts — Single point of truth for all CSV read/write operations.
 * Port of logging_module/activity_logger.py
 *
 * Handles:
 *   - buyers.csv    (discovered buyer records)
 *   - sent_log.csv  (outreach history / duplicate-prevention)
 *   - business_emails.csv
 *   - individual_emails.csv
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import {
  BUYERS_CSV,
  SENT_LOG_CSV,
  BUSINESS_EMAILS_CSV,
  INDIVIDUAL_EMAILS_CSV,
  BUYERS_COLUMNS,
  SENT_LOG_COLUMNS,
} from '@/lib/config';
import type { BuyerRecord, SentLogRecord, DatabaseStats } from '@/types';

// ── Utility Helpers ────────────────────────────────────────────────────────────

function ensureFile(filePath: string, columns: readonly string[]): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    fs.writeFileSync(filePath, columns.join(',') + '\n', 'utf-8');
  }
}

function readCsv<T = Record<string, string>>(
  filePath: string,
  columns: readonly string[]
): T[] {
  ensureFile(filePath, columns);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
    // Ensure all schema columns exist on each record
    return records.map((r) => {
      const filled = { ...r };
      for (const col of columns) {
        if (!(col in filled)) filled[col] = '';
      }
      return filled as T;
    });
  } catch {
    return [];
  }
}

function fileSizeKb(filePath: string): number {
  try {
    return Math.round((fs.statSync(filePath).size / 1024) * 10) / 10;
  } catch {
    return 0;
  }
}

// ── Buyers CSV ─────────────────────────────────────────────────────────────────

export function readBuyers(): BuyerRecord[] {
  return readCsv<BuyerRecord>(BUYERS_CSV, BUYERS_COLUMNS);
}

export function appendBuyers(records: Partial<BuyerRecord>[]): number {
  if (!records.length) return 0;
  ensureFile(BUYERS_CSV, BUYERS_COLUMNS);

  const existing = readBuyers();
  const existingEmails = new Set(existing.map((r) => (r.email ?? '').toLowerCase()));

  const newRows = records.filter(
    (r) => r.email && !existingEmails.has(r.email.toLowerCase())
  );

  if (!newRows.length) return 0;

  const rows = newRows.map((r) => {
    const row: Record<string, string> = {};
    for (const col of BUYERS_COLUMNS) {
      row[col] = (r as Record<string, string | undefined>)[col] ?? '';
    }
    return row;
  });

  const csv = stringify(rows, { header: false, columns: [...BUYERS_COLUMNS] });
  fs.appendFileSync(BUYERS_CSV, csv, 'utf-8');
  return newRows.length;
}

// ── Sent Log CSV ───────────────────────────────────────────────────────────────

export function readSentLog(): SentLogRecord[] {
  return readCsv<SentLogRecord>(SENT_LOG_CSV, SENT_LOG_COLUMNS);
}

export function getSentEmails(): Set<string> {
  const records = readSentLog();
  return new Set(records.map((r) => r.email?.toLowerCase()).filter(Boolean));
}

export function logSendAttempt(email: string, status: 'sent' | 'failed', subject = ''): void {
  ensureFile(SENT_LOG_CSV, SENT_LOG_COLUMNS);
  const row = {
    email: email.toLowerCase().trim(),
    status,
    timestamp: new Date().toISOString(),
    subject,
  };
  const csv = stringify([row], { header: false, columns: [...SENT_LOG_COLUMNS] });
  fs.appendFileSync(SENT_LOG_CSV, csv, 'utf-8');
}

export function logCampaignResults(
  reportData: { successful?: string[]; failed?: string[] },
  subject = ''
): void {
  for (const email of reportData.successful ?? []) logSendAttempt(email, 'sent', subject);
  for (const email of reportData.failed ?? []) logSendAttempt(email, 'failed', subject);
}

// ── Classified Email CSVs ──────────────────────────────────────────────────────

export function saveClassifiedEmails(business: string[], individual: string[]): void {
  const entries: [string, string[]][] = [
    [BUSINESS_EMAILS_CSV, business],
    [INDIVIDUAL_EMAILS_CSV, individual],
  ];
  for (const [filePath, emails] of entries) {
    const rows = emails.map((e) => [e.toLowerCase().trim()]);
    const csv = stringify([['email'], ...rows]);
    fs.writeFileSync(filePath, csv, 'utf-8');
  }
}

export function readClassifiedEmails(audience: 'business' | 'individual' | 'all' = 'all'): string[] {
  const emails: string[] = [];

  if (audience === 'business' || audience === 'all') {
    const rows = readCsv<{ email: string }>(BUSINESS_EMAILS_CSV, ['email']);
    emails.push(...rows.map((r) => r.email?.toLowerCase()).filter(Boolean));
  }
  if (audience === 'individual' || audience === 'all') {
    const rows = readCsv<{ email: string }>(INDIVIDUAL_EMAILS_CSV, ['email']);
    emails.push(...rows.map((r) => r.email?.toLowerCase()).filter(Boolean));
  }

  // Deduplicate preserving order
  const seen = new Set<string>();
  return emails.filter((e) => {
    if (!e || seen.has(e)) return false;
    seen.add(e);
    return true;
  });
}

// ── Stats Helpers ──────────────────────────────────────────────────────────────

export function getDatabaseStats(): DatabaseStats {
  const buyers = readBuyers();
  const sentLog = readSentLog();
  const bizEmails = readClassifiedEmails('business');
  const indEmails = readClassifiedEmails('individual');

  const sentSuccess = sentLog.filter((r) => r.status === 'sent').length;
  const sentFailed = sentLog.filter((r) => r.status === 'failed').length;

  return {
    total_buyers: buyers.length,
    total_sent: sentLog.length,
    sent_success: sentSuccess,
    sent_failed: sentFailed,
    business_emails: bizEmails.length,
    individual_emails: indEmails.length,
    buyers_csv_size: fileSizeKb(BUYERS_CSV),
    sent_log_size: fileSizeKb(SENT_LOG_CSV),
  };
}
