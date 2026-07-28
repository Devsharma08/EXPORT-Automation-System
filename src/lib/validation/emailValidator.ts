/**
 * emailValidator.ts — Regex-based email validation.
 * Port of validation/email_validator.py
 */

import type { BuyerRecord, ValidationResult } from '@/types';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwam.com',
  'yopmail.com', 'trashmail.com', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamailblock.com', 'spam4.me', 'dispostable.com', 'maildrop.cc',
  '10minutemail.com', 'temp-mail.org', 'getnada.com', 'mailnull.com',
  'spamgourmet.com', 'trashmail.me', 'discard.email',
]);

const PLACEHOLDER_PATTERN =
  /(example|test|noreply|no-reply|donotreply|do-not-reply|info@example|user@domain|email@email|sample|placeholder|dummy|fake|admin@localhost)/i;

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff',
]);

function isValidSyntax(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function isDisposable(email: string): boolean {
  const domain = email.split('@').pop()?.toLowerCase() ?? '';
  return DISPOSABLE_DOMAINS.has(domain);
}

function isPlaceholder(email: string): boolean {
  return PLACEHOLDER_PATTERN.test(email);
}

function isImageExtension(email: string): boolean {
  const local = email.split('@')[0].toLowerCase();
  return IMAGE_EXTENSIONS.has(local.split('.').pop() ?? '');
}

function isDomainTooLong(email: string): boolean {
  return (email.split('@').pop()?.length ?? 0) > 50;
}

export function validateEmail(email: string): { valid: boolean; reason: string } {
  if (!email || typeof email !== 'string') return { valid: false, reason: 'Empty or non-string email' };
  const e = email.trim().toLowerCase();
  if (!isValidSyntax(e)) return { valid: false, reason: `Invalid syntax: ${e}` };
  if (isImageExtension(e)) return { valid: false, reason: `Image extension false-positive: ${e}` };
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
