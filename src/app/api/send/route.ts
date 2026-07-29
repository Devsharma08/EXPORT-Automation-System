import { NextRequest, NextResponse } from 'next/server';
import {
  readBuyers,
  readClassifiedEmails,
  getSentEmails,
  logCampaignResults,
} from '@/lib/data/activityLogger';
import { loadSettings } from '@/lib/data/settingsHelper';
import { sendCampaign } from '@/lib/outreach/gmailSender';
import { buildRunReport } from '@/lib/reports/reportGenerator';

// In-memory store for the most recent campaign result (per-process, like Python global)
let _latestReport: Record<string, unknown> = {};

export function getLatestReport() {
  return _latestReport;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      subject?: string;
      body?: string;
      audience?: string;
      use_attachment?: boolean;
    };

    const subject = (body.subject ?? '').trim();
    const emailBody = (body.body ?? '').trim();
    const audience = (body.audience ?? 'all') as 'business' | 'individual' | 'all';
    const useAttachment = body.use_attachment ?? false;

    if (!subject || !emailBody) {
      return NextResponse.json({ error: 'Subject and body are required.' }, { status: 400 });
    }

    const settings = loadSettings();
    const gmailEmail = settings.email;
    const gmailPassword = settings.app_password;

    if (!gmailEmail || !gmailPassword) {
      return NextResponse.json({ error: 'Gmail credentials not configured.' }, { status: 400 });
    }

    // Get recipients
    let audienceEmails = readClassifiedEmails(audience);
    if (!audienceEmails.length) {
      const buyers = readBuyers();
      audienceEmails = buyers.map((r) => r.email).filter(Boolean);
    }

    if (!audienceEmails.length) {
      return NextResponse.json({
        error: 'No recipients found. Upload buyers and run classification first.',
      }, { status: 400 });
    }

    // Filter already-sent (DISABLED per user request to allow re-sending)
    const newEmails = audienceEmails;

    if (!newEmails.length) {
      return NextResponse.json({
        error: 'All recipients in the selected audience have already been contacted.',
      }, { status: 400 });
    }

    // Enrich with buyer data
    const buyersMap = Object.fromEntries(
      readBuyers().map((r) => [r.email?.toLowerCase(), r])
    );
    const recipients = newEmails.map((email) => {
      const buyer = buyersMap[email] ?? {};
      return {
        email,
        buyer_name: buyer.buyer_name ?? '',
        company_name: buyer.company_name ?? '',
      };
    });

    const reportData = await sendCampaign({
      subject,
      body: emailBody,
      recipients,
      attachmentPath: useAttachment ? settings.presentation_path : undefined,
      gmailEmail,
      gmailPassword,
      ccEmail: settings.cc_email,
      sendDelay: settings.send_delay,
      dailyLimit: settings.daily_send_limit,
    });

    logCampaignResults(reportData, subject);
    _latestReport = { ...reportData, subject, total_recipients: reportData.total } as Record<string, unknown>;

    const fullReport = buildRunReport(_latestReport as never);
    return NextResponse.json({
      message: `Campaign complete! ${reportData.success_count} sent, ${reportData.failed_count} failed.`,
      report: fullReport,
    });
  } catch (err) {
    return NextResponse.json({ error: `Campaign error: ${String(err)}` }, { status: 500 });
  }
}
