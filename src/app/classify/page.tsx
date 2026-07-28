import type { Metadata } from 'next';
import { readClassifiedEmails } from '@/lib/data/activityLogger';
import ClassifyClient from '@/components/ClassifyClient';

export const dynamic = 'force-dynamic';


export const metadata: Metadata = { title: 'AI Classify — EXPORT Automation System' };

export default function ClassifyPage() {
  const bizEmails = readClassifiedEmails('business');
  const indEmails = readClassifiedEmails('individual');
  return (
    <ClassifyClient
      initial={{
        biz_emails: bizEmails.slice(0, 20),
        ind_emails: indEmails.slice(0, 20),
        biz_count: bizEmails.length,
        ind_count: indEmails.length,
      }}
    />
  );
}
