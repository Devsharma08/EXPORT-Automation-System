/**
 * settingsHelper.ts — Read/write settings.json
 * Port of data/settings_helper.py
 */

import fs from 'fs';
import { SETTINGS_JSON } from '@/lib/config';
import type { AppSettings } from '@/types';

const DEFAULTS: AppSettings = {
  email: '',
  app_password: '',
  cc_email: '',
  gemini_api_key: '',
  default_subject: 'Singing Bowls — Product Catalogue',
  default_body:
    'Dear {name},\n\nWe are a premier manufacturer and exporter of authentic Himalayan Singing Bowls. Please find our product catalogue attached.\n\nWe would love to explore a business relationship with you.\n\nBest regards,\nThe Export Team',
  send_delay: 2,
  daily_send_limit: 100,
  presentation_path: 'assets/company_presentation.pdf',
  classification_preference: 'both',
};

export function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_JSON)) {
      const raw = fs.readFileSync(SETTINGS_JSON, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULTS };
}

export function saveSettings(data: Partial<AppSettings>): boolean {
  try {
    const current = loadSettings();
    const merged = { ...current, ...data };
    fs.writeFileSync(SETTINGS_JSON, JSON.stringify(merged, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}
