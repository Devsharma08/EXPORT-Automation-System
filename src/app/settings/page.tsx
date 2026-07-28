import type { Metadata } from 'next';
import { loadSettings } from '@/lib/data/settingsHelper';
import { getAttachmentInfo } from '@/lib/outreach/attachmentHandler';
import SettingsClient from '@/components/SettingsClient';

export const metadata: Metadata = { title: 'Settings — EXPORT Automation System' };

export default function SettingsPage() {
  const settings = loadSettings();
  const attachment = getAttachmentInfo(settings.presentation_path);
  return (
    <SettingsClient
      settings={settings}
      attachment={{ exists: attachment.exists, filename: attachment.filename, size_kb: attachment.size_kb }}
    />
  );
}
