/**
 * settingsHelper.ts — Read/write settings.json
 * Port of data/settings_helper.py
 */

import fs from 'fs';
import { SETTINGS_JSON, GEMINI_API_KEY, GMAIL_EMAIL, GMAIL_APP_PASSWORD, CC_EMAIL, SERPER_API_KEY, SCRAPINGBEE_API_KEY, TAVILY_API_KEY } from '@/lib/config';
import type { AppSettings } from '@/types';

const DEFAULTS: AppSettings = {
  email: GMAIL_EMAIL,
  app_password: GMAIL_APP_PASSWORD,
  cc_email: CC_EMAIL,
  gemini_api_key: GEMINI_API_KEY,
  serper_api_key: SERPER_API_KEY,
  scrapingbee_api_key: SCRAPINGBEE_API_KEY,
  tavily_api_key: TAVILY_API_KEY,
  default_subject: 'Premium Crystal & Glass Candle Holders — Bulk Export Range (23+ SKUs)',
  default_body:
    'Product Zone International manufactures export-grade crystal-cut votives, textured glassware, and statement centerpieces. Please find our catalog attached.',
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
      const loaded = { 
        ...DEFAULTS, 
        ...parsed,
        email: parsed.email || DEFAULTS.email,
        app_password: parsed.app_password || DEFAULTS.app_password,
        cc_email: parsed.cc_email || DEFAULTS.cc_email,
        gemini_api_key: parsed.gemini_api_key || DEFAULTS.gemini_api_key,
        serper_api_key: parsed.serper_api_key || DEFAULTS.serper_api_key,
        scrapingbee_api_key: parsed.scrapingbee_api_key || DEFAULTS.scrapingbee_api_key,
        tavily_api_key: parsed.tavily_api_key || DEFAULTS.tavily_api_key,
      };

      // Keep process.env in sync
      if (loaded.gemini_api_key) process.env.GEMINI_API_KEY = loaded.gemini_api_key;
      if (loaded.serper_api_key) process.env.SERPER_API_KEY = loaded.serper_api_key;
      if (loaded.scrapingbee_api_key) process.env.SCRAPINGBEE_API_KEY = loaded.scrapingbee_api_key;
      if (loaded.tavily_api_key) process.env.TAVILY_API_KEY = loaded.tavily_api_key;

      return loaded;
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

    // Dynamically sync process.env
    if (merged.gemini_api_key !== undefined) process.env.GEMINI_API_KEY = merged.gemini_api_key;
    if (merged.serper_api_key !== undefined) process.env.SERPER_API_KEY = merged.serper_api_key;
    if (merged.scrapingbee_api_key !== undefined) process.env.SCRAPINGBEE_API_KEY = merged.scrapingbee_api_key;
    if (merged.tavily_api_key !== undefined) process.env.TAVILY_API_KEY = merged.tavily_api_key;

    return true;
  } catch {
    return false;
  }
}
