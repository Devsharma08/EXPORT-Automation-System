import type { Metadata } from 'next';
import { getDatabaseStats, readBuyersWithStatus } from '@/lib/data/activityLogger';
import UploadClient from '@/components/UploadClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Lead Database & Upload — EXPORT Automation System' };

export default function UploadPage() {
  const stats = getDatabaseStats();
  const allBuyers = readBuyersWithStatus().reverse();
  return <UploadClient stats={stats} initialBuyers={allBuyers} />;
}
