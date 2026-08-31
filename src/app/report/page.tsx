import type { Metadata } from 'next';
import { buildRunReport } from '@/lib/reports/reportGenerator';
import { readSentLog } from '@/lib/data/activityLogger';
import ReportClient from '@/components/ReportClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Campaign Report & Sent History — EXPORT Automation System' };

export default function ReportPage() {
  const report = buildRunReport(null);
  const sentLog = readSentLog();

  return <ReportClient report={report} sentLog={sentLog} />;
}
