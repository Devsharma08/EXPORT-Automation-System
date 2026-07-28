/**
 * reportGenerator.ts — Builds run summary reports.
 * Port of reports/report_generator.py
 */

import { getDatabaseStats, readSentLog } from '@/lib/data/activityLogger';
import type { ReportData } from '@/types';

export function buildRunReport(reportData?: Partial<ReportData> | null): ReportData {
  const stats = getDatabaseStats();

  if (reportData && reportData.total_recipients !== undefined) {
    const total = reportData.total_recipients ?? 0;
    const success = reportData.success_count ?? 0;
    const failed = reportData.failed_count ?? 0;
    const rate = total > 0 ? Math.round((success / total) * 1000) / 10 : 0;

    return {
      run_type: 'campaign',
      generated_at: new Date().toISOString(),
      total_recipients: total,
      success_count: success,
      failed_count: failed,
      success_rate: rate,
      successful_emails: reportData.successful_emails ?? [],
      failed_emails: reportData.failed_emails ?? [],
      subject: reportData.subject,
      ...stats,
    };
  }

  // Historical summary
  const total = stats.total_sent;
  const success = stats.sent_success;
  const failed = stats.sent_failed;
  const rate = total > 0 ? Math.round((success / total) * 1000) / 10 : 0;

  return {
    run_type: 'historical',
    generated_at: new Date().toISOString(),
    total_recipients: total,
    success_count: success,
    failed_count: failed,
    success_rate: rate,
    successful_emails: [],
    failed_emails: [],
    ...stats,
  };
}

export function generateCsvReport(reportData?: Partial<ReportData> | null): string {
  const sentLog = readSentLog();
  const stats = getDatabaseStats();

  const lines: string[] = ['email,status,timestamp,subject'];
  for (const row of sentLog) {
    lines.push(
      [row.email, row.status, row.timestamp, `"${row.subject.replace(/"/g, '""')}"`].join(',')
    );
  }

  lines.push('');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Total Buyers Discovered: ${stats.total_buyers}`);
  lines.push(`# Total Emails Sent: ${stats.sent_success}`);
  lines.push(`# Total Failures: ${stats.sent_failed}`);

  if (reportData?.success_rate !== undefined) {
    lines.push(`# Campaign Success Rate: ${reportData.success_rate}%`);
  }

  return lines.join('\n');
}
