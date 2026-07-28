// Shared TypeScript types for the EXPORT Automation System

export interface BuyerRecord {
  buyer_name: string;
  company_name: string;
  email: string;
  website: string;
  country: string;
  source_platform: string;
  discovered_at: string;
}

export interface SentLogRecord {
  email: string;
  status: 'sent' | 'failed';
  timestamp: string;
  subject: string;
}

export interface DatabaseStats {
  total_buyers: number;
  total_sent: number;
  sent_success: number;
  sent_failed: number;
  business_emails: number;
  individual_emails: number;
  buyers_csv_size: number;
  sent_log_size: number;
}

export interface ReportData {
  run_type: 'campaign' | 'historical';
  generated_at: string;
  total_recipients: number;
  success_count: number;
  failed_count: number;
  success_rate: number;
  successful_emails: string[];
  failed_emails: string[];
  subject?: string;
  error?: string;
  total_buyers?: number;
  total_sent?: number;
  sent_success?: number;
  sent_failed?: number;
  business_emails?: number;
  individual_emails?: number;
  buyers_csv_size?: number;
  sent_log_size?: number;
}

export interface AppSettings {
  email: string;
  app_password: string;
  cc_email: string;
  gemini_api_key: string;
  default_subject: string;
  default_body: string;
  send_delay: number;
  daily_send_limit: number;
  presentation_path: string;
  classification_preference: string;
}

export interface CampaignPayload {
  subject: string;
  body: string;
  recipients: Array<{ email: string; buyer_name?: string; company_name?: string }>;
  attachment_path?: string;
  gmail_email: string;
  gmail_password: string;
  cc_email?: string;
  send_delay?: number;
  daily_limit?: number;
}

export interface SearchStatus {
  running: boolean;
  log: string[];
}

export interface ClassificationResult {
  business: string[];
  individual: string[];
}

export interface ValidationResult {
  valid: BuyerRecord[];
  invalid: Array<BuyerRecord & { validation_error: string }>;
}

export type FlashCategory = 'success' | 'error' | 'warning' | 'info';

export interface FlashMessage {
  category: FlashCategory;
  message: string;
}
