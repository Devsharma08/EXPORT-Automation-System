/**
 * emailValidator.ts — Regex & rules-based email validation.
 * Filters false positives, static assets, disposable emails, and placeholder emails.
 */

import type { BuyerRecord, ValidationResult } from '@/types';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,24}$/;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwam.com',
  'yopmail.com', 'trashmail.com', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamailblock.com', 'spam4.me', 'dispostable.com', 'maildrop.cc',
  '10minutemail.com', 'temp-mail.org', 'getnada.com', 'mailnull.com',
  'spamgourmet.com', 'trashmail.me', 'discard.email',
]);

const PLACEHOLDER_PATTERN =
  /(example|test|noreply|no-reply|donotreply|do-not-reply|info@example|user@domain|email@email|sample|placeholder|dummy|fake|admin@localhost|yourname@|someone@|name@domain)/i;

const ASSET_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff', 'css', 'js', 'woff', 'woff2', 'ttf', 'eot', 'mp4', 'mp3', 'zip', 'rar', 'pdf'
]);

function isValidSyntax(email: string): boolean {
  if (!EMAIL_REGEX.test(email)) return false;
  // Check if TLD ends with digits (e.g., package versions bootstrap@5.3)
  const tld = email.split('.').pop() ?? '';
  if (/^\d+$/.test(tld)) return false;
  return true;
}

function isDisposable(email: string): boolean {
  const domain = email.split('@').pop()?.toLowerCase() ?? '';
  return DISPOSABLE_DOMAINS.has(domain);
}

function isPlaceholder(email: string): boolean {
  return PLACEHOLDER_PATTERN.test(email);
}

function isAssetFalsePositive(email: string): boolean {
  const local = email.split('@')[0].toLowerCase();
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  const localExt = local.split('.').pop() ?? '';
  const domainExt = domain.split('.').pop() ?? '';

  if (ASSET_EXTENSIONS.has(localExt) || ASSET_EXTENSIONS.has(domainExt)) {
    // Exception for pdf if domain is legitimate email provider, but otherwise flag asset strings
    if (ASSET_EXTENSIONS.has(localExt) && localExt !== 'pdf') return true;
  }
  return false;
}

function isDomainTooLong(email: string): boolean {
  return (email.split('@').pop()?.length ?? 0) > 50;
}

export function validateEmail(email: string): { valid: boolean; reason: string } {
  if (!email || typeof email !== 'string') return { valid: false, reason: 'Empty or non-string email' };
  const e = email.trim().toLowerCase();
  if (!isValidSyntax(e)) return { valid: false, reason: `Invalid syntax or version string: ${e}` };
  if (isAssetFalsePositive(e)) return { valid: false, reason: `Asset filename false-positive: ${e}` };
  if (isDomainTooLong(e)) return { valid: false, reason: `Domain too long: ${e}` };
  if (isDisposable(e)) return { valid: false, reason: `Disposable domain: ${e}` };
  if (isPlaceholder(e)) return { valid: false, reason: `Placeholder email: ${e}` };
  return { valid: true, reason: '' };
}

export function validateRecords(records: Partial<BuyerRecord>[]): ValidationResult {
  const valid: BuyerRecord[] = [];
  const invalid: Array<BuyerRecord & { validation_error: string }> = [];

  for (const record of records) {
    const { valid: isValid, reason } = validateEmail(record.email ?? '');
    if (isValid) {
      valid.push(record as BuyerRecord);
    } else {
      invalid.push({ ...(record as BuyerRecord), validation_error: reason });
    }
  }
  return { valid, invalid };
}

export function filterAlreadySent(
  valid: BuyerRecord[],
  sentEmails: Set<string>
): { newRecords: BuyerRecord[]; duplicates: BuyerRecord[] } {
  const newRecords: BuyerRecord[] = [];
  const duplicates: BuyerRecord[] = [];
  for (const record of valid) {
    if (sentEmails.has(record.email?.toLowerCase() ?? '')) {
      duplicates.push(record);
    } else {
      newRecords.push(record);
    }
  }
  return { newRecords, duplicates };
}
