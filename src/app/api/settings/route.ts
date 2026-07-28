import { NextRequest, NextResponse } from 'next/server';
import { loadSettings, saveSettings } from '@/lib/data/settingsHelper';
import { getAttachmentInfo } from '@/lib/outreach/attachmentHandler';

export async function GET() {
  try {
    const settings = loadSettings();
    const attachment = getAttachmentInfo(settings.presentation_path);
    return NextResponse.json({ settings, attachment });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const success = saveSettings({
      email: String(body.email ?? '').trim(),
      app_password: String(body.app_password ?? '').trim(),
      cc_email: String(body.cc_email ?? '').trim(),
      gemini_api_key: String(body.gemini_api_key ?? '').trim(),
      default_subject: String(body.default_subject ?? '').trim(),
      default_body: String(body.default_body ?? '').trim(),
      send_delay: parseFloat(body.send_delay ?? 2),
      daily_send_limit: parseInt(body.daily_send_limit ?? 100, 10),
      presentation_path: String(body.presentation_path ?? '').trim(),
      classification_preference: String(body.classification_preference ?? 'both'),
    });

    if (success) {
      return NextResponse.json({ message: 'Settings saved successfully.' });
    } else {
      return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
