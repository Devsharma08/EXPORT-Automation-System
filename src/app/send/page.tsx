import type { Metadata } from 'next';
import { loadSettings } from '@/lib/data/settingsHelper';
import { getAttachmentInfo } from '@/lib/outreach/attachmentHandler';
import { readClassifiedEmails } from '@/lib/data/activityLogger';
import SendClient from '@/components/SendClient';

export const dynamic = 'force-dynamic';


export const metadata: Metadata = { title: 'Send Campaign — EXPORT Automation System' };

export default function SendPage() {
  const settings = loadSettings();
  const attachment = getAttachmentInfo(settings.presentation_path);
  const bizCount = readClassifiedEmails('business').length;
  const indCount = readClassifiedEmails('individual').length;
  const allCount = readClassifiedEmails('all').length;

  return (
    <SendClient
      settings={settings}
      attachment={{ exists: attachment.exists, filename: attachment.filename, size_kb: attachment.size_kb }}
      biz_count={bizCount}
      ind_count={indCount}
      all_count={allCount}
    />
  );
}
