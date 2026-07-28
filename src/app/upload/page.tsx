import type { Metadata } from 'next';
import { getDatabaseStats, readBuyers } from '@/lib/data/activityLogger';
import UploadClient from '@/components/UploadClient';

export const dynamic = 'force-dynamic';


export const metadata: Metadata = { title: 'Upload Leads — EXPORT Automation System' };

export default function UploadPage() {
  const stats = getDatabaseStats();
  const allBuyers = readBuyers();
  const recentBuyers = allBuyers.slice(-10).reverse();
  return <UploadClient stats={stats} recentBuyers={recentBuyers} />;
}
