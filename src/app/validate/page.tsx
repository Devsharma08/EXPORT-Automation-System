import type { Metadata } from 'next';
import { getDatabaseStats } from '@/lib/data/activityLogger';
import ValidateClient from '@/components/ValidateClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Validate Emails — EXPORT Automation System' };

export default function ValidatePage() {
  const stats = getDatabaseStats();
  return <ValidateClient initial_count={stats.total_buyers} />;
}
