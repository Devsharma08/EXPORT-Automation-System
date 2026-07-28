import { NextRequest, NextResponse } from 'next/server';
import { readBuyers, saveClassifiedEmails, readClassifiedEmails } from '@/lib/data/activityLogger';
import { loadSettings } from '@/lib/data/settingsHelper';
import { classifyWithGemini } from '@/lib/ai/geminiClassifier';

export async function GET() {
  try {
    const bizEmails = readClassifiedEmails('business');
    const indEmails = readClassifiedEmails('individual');
    return NextResponse.json({
      biz_emails: bizEmails.slice(0, 20),
      ind_emails: indEmails.slice(0, 20),
      biz_count: bizEmails.length,
      ind_count: indEmails.length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { api_key?: string };
    const settings = loadSettings();
    const apiKey = body.api_key || settings.gemini_api_key;

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 400 });
    }

    const buyers = readBuyers();
    const allEmails = [...new Set(buyers.map((r) => r.email?.toLowerCase()).filter(Boolean))];

    if (!allEmails.length) {
      return NextResponse.json({ error: 'No emails in database to classify.' }, { status: 400 });
    }

    const { business, individual } = await classifyWithGemini(allEmails, apiKey);
    saveClassifiedEmails(business, individual);

    return NextResponse.json({
      message: `Classification complete! ${business.length} business, ${individual.length} individual contacts.`,
      business_count: business.length,
      individual_count: individual.length,
    });
  } catch (err) {
    return NextResponse.json({ error: `Classification failed: ${String(err)}` }, { status: 500 });
  }
}
