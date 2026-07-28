/**
 * config.ts — Central configuration for the EXPORT Automation System.
 * Port of config.py — reads process.env for all runtime settings.
 */

import path from 'path';

const BASE_DIR = process.cwd();
const DATA_DIR = path.join(BASE_DIR, 'data');
const ASSETS_DIR = path.join(BASE_DIR, 'assets');

// ── Search Settings ────────────────────────────────────────────────────────────
export const SEARCH_KEYWORD = process.env.SEARCH_KEYWORD ?? 'Singing Bowls';
export const MAX_RESULTS_PER_SOURCE = parseInt(process.env.MAX_RESULTS_PER_SOURCE ?? '20', 10);

export const ENABLED_SOURCES: Record<string, boolean> = {
  google: true,
  facebook: true,
  linkedin: true,
  directory: true,
  website: true,
};

// ── Email / Outreach Settings ──────────────────────────────────────────────────
export const GMAIL_EMAIL = process.env.GMAIL_EMAIL ?? '';
export const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? '';
export const CC_EMAIL = process.env.CC_EMAIL ?? '';
export const DAILY_SEND_LIMIT = parseInt(process.env.DAILY_SEND_LIMIT ?? '100', 10);
export const SEND_DELAY_SECONDS = parseFloat(process.env.SEND_DELAY_SECONDS ?? '2');

// ── SMTP Configuration ─────────────────────────────────────────────────────────
export const SMTP_HOST = 'smtp.gmail.com';
export const SMTP_PORT_SSL = 465;
export const SMTP_PORT_TLS = 587;

// ── File Paths ─────────────────────────────────────────────────────────────────
export { DATA_DIR, ASSETS_DIR, BASE_DIR };

export const BUYERS_CSV = path.join(DATA_DIR, 'buyers.csv');
export const SENT_LOG_CSV = path.join(DATA_DIR, 'sent_log.csv');
export const BUSINESS_EMAILS_CSV = path.join(DATA_DIR, 'business_emails.csv');
export const INDIVIDUAL_EMAILS_CSV = path.join(DATA_DIR, 'individual_emails.csv');
export const SETTINGS_JSON = path.join(DATA_DIR, 'settings.json');

export const PRESENTATION_PATH =
  process.env.PRESENTATION_PATH ?? path.join(ASSETS_DIR, 'company_presentation.pdf');

// ── AI / Gemini Settings ───────────────────────────────────────────────────────
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
export const GEMINI_MODEL = 'gemini-1.5-flash';
export const CLASSIFICATION_BATCH_SIZE = 20;

// ── Allowed Attachment Extensions ─────────────────────────────────────────────
export const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['.pdf', '.pptx', '.ppt', '.docx', '.doc']);

// ── Blocklisted Domains ───────────────────────────────────────────────────────
export const BLOCKLISTED_DOMAINS = new Set([
  'google.com', 'gstatic.com', 'googleapis.com',
  'facebook.com', 'fb.com',
  'linkedin.com',
  'youtube.com', 'youtu.be',
  'twitter.com', 'x.com',
  'wikipedia.org',
  'amazon.com', 'ebay.com',
]);

// ── Image Extensions ──────────────────────────────────────────────────────────
export const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico',
]);

// ── CSV Column Schemas ────────────────────────────────────────────────────────
export const BUYERS_COLUMNS = [
  'buyer_name',
  'company_name',
  'email',
  'website',
  'country',
  'source_platform',
  'discovered_at',
] as const;

export const SENT_LOG_COLUMNS = ['email', 'status', 'timestamp', 'subject'] as const;
