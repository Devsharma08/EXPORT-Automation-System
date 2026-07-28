/**
 * attachmentHandler.ts — Handles presentation file attachment for nodemailer.
 * Port of outreach/attachment_handler.py
 */

import fs from 'fs';
import path from 'path';
import { ALLOWED_ATTACHMENT_EXTENSIONS } from '@/lib/config';

export interface AttachmentInfo {
  exists: boolean;
  filename: string;
  size_kb: number;
  path: string;
}

export function getAttachmentInfo(filePath: string): AttachmentInfo {
  if (!filePath) return { exists: false, filename: '', size_kb: 0, path: '' };
  try {
    const stats = fs.statSync(filePath);
    return {
      exists: true,
      filename: path.basename(filePath),
      size_kb: Math.round((stats.size / 1024) * 10) / 10,
      path: filePath,
    };
  } catch {
    return { exists: false, filename: path.basename(filePath), size_kb: 0, path: filePath };
  }
}

export function buildAttachment(filePath: string): { filename: string; content: Buffer } | null {
  if (!filePath) return null;
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(ext)) return null;
  try {
    return {
      filename: path.basename(filePath),
      content: fs.readFileSync(filePath),
    };
  } catch {
    return null;
  }
}
