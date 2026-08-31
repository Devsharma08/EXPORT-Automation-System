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
      force_resend?: boolean;
      selected_emails?: string[];
    };

    const subject = (body.subject ?? '').trim();
    const emailBody = (body.body ?? '').trim();
    const audience = (body.audience ?? 'all') as 'business' | 'individual' | 'all';
    const useAttachment = body.use_attachment ?? false;
    const forceResend = body.force_resend ?? false;
    const selectedEmails = body.selected_emails ? new Set(body.selected_emails.map((e) => e.toLowerCase().trim())) : null;

    if (!subject || !emailBody) {
      return NextResponse.json({ error: 'Subject and body are required.' }, { status: 400 });
    }

    const settings = loadSettings();
    const gmailEmail = settings.email;
    const gmailPassword = settings.app_password;

    if (!gmailEmail || !gmailPassword) {
      return NextResponse.json({ error: 'Gmail credentials not configured. Check Settings.' }, { status: 400 });
    }

    // Get recipients directly from discovered buyers
    const buyers = readBuyers();
    const seenRaw = new Set<string>();
    let targetEmails = buyers
      .map((r) => r.email)
      .filter((e): e is string => !!e)
      .filter((e) => {
        const low = e.toLowerCase().trim();
        if (seenRaw.has(low)) return false;
        seenRaw.add(low);
        return true;
      });

    // If specific emails were selected, narrow to them
    if (selectedEmails && selectedEmails.size > 0) {
      targetEmails = targetEmails.filter((e) => selectedEmails.has(e.toLowerCase().trim()));
    }

    if (!targetEmails.length) {
      return NextResponse.json({
        error: 'No discovered buyer emails found matching criteria in database.',
      }, { status: 400 });
    }

    // Filter already-sent emails if safe mode (forceResend is false)
    const sentEmails = getSentEmails();
    const finalEmails = forceResend
      ? targetEmails
      : targetEmails.filter((email) => !sentEmails.has(email.toLowerCase().trim()));

    if (!finalEmails.length) {
      return NextResponse.json({
        error: 'All selected buyer emails have already been contacted. Enable "Force Re-send" if you wish to contact them again.',
      }, { status: 400 });
    }

    // Enrich with buyer data
    const buyersMap = new Map<string, typeof buyers[0]>();
    for (const b of buyers) {
      if (b.email) {
        buyersMap.set(b.email.toLowerCase().trim(), b);
      }
    }

    const recipients = finalEmails.map((email) => {
      const buyer = buyersMap.get(email.toLowerCase().trim());
      return {
        email: email.toLowerCase().trim(),
        buyer_name: buyer?.buyer_name ?? '',
        company_name: buyer?.company_name ?? '',
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
    const skippedCount = targetEmails.length - finalEmails.length;
    const skipMsg = skippedCount > 0 ? ` (${skippedCount} already-contacted leads skipped)` : '';

    return NextResponse.json({
      message: `Campaign complete! ${reportData.success_count} sent, ${reportData.failed_count} failed${skipMsg}.`,
      report: fullReport,
    });
  } catch (err) {
    return NextResponse.json({ error: `Campaign error: ${String(err)}` }, { status: 500 });
  }
}
