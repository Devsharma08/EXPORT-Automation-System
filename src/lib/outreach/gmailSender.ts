/**
 * gmailSender.ts — Email composition and campaign dispatch via nodemailer.
 * Port of outreach/gmail_sender.py
 *
 * Uses nodemailer with SMTP SSL on port 465 (same as Python smtplib SMTP_SSL).
 * Gmail App Password works identically.
 */

import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import {
  SMTP_HOST,
  SMTP_PORT_SSL,
  GMAIL_EMAIL,
  GMAIL_APP_PASSWORD,
  CC_EMAIL,
  SEND_DELAY_SECONDS,
  DAILY_SEND_LIMIT,
} from '@/lib/config';
import { buildAttachment } from '@/lib/outreach/attachmentHandler';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTransport(gmailEmail: string, gmailPassword: string) {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT_SSL,
    secure: true, // SSL
    auth: { user: gmailEmail, pass: gmailPassword },
  });
}

function personalizeBody(body: string, buyerName: string, companyName: string): string {
  const name = buyerName || companyName || 'Sir/Madam';
  return body
    .replace(/\{name\}/g, name)
    .replace(/\{company\}/g, companyName || 'your company');
}

export interface CampaignRecipient {
  email: string;
  buyer_name?: string;
  company_name?: string;
}

export interface CampaignResult {
  total: number;
  success_count: number;
  failed_count: number;
  successful: string[];
  failed: string[];
  error?: string;
}

export async function sendCampaign({
  subject,
  body,
  recipients,
  attachmentPath,
  gmailEmail = GMAIL_EMAIL,
  gmailPassword = GMAIL_APP_PASSWORD,
  ccEmail = CC_EMAIL,
  sendDelay = SEND_DELAY_SECONDS,
  dailyLimit = DAILY_SEND_LIMIT,
}: {
  subject: string;
  body: string;
  recipients: CampaignRecipient[];
  attachmentPath?: string;
  gmailEmail?: string;
  gmailPassword?: string;
  ccEmail?: string;
  sendDelay?: number;
  dailyLimit?: number;
}): Promise<CampaignResult> {
  // De-duplicate recipients
  const seen = new Set<string>();
  const uniqueRecipients = recipients.filter((r) => {
    const email = r.email?.trim().toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });

  if (!uniqueRecipients.length) {
    return { total: 0, success_count: 0, failed_count: 0, successful: [], failed: [], error: 'No recipients found.' };
  }

  const limited = uniqueRecipients.slice(0, dailyLimit);
  const total = limited.length;

  const result: CampaignResult = {
    total,
    success_count: 0,
    failed_count: 0,
    successful: [],
    failed: [],
  };

  let transport = buildTransport(gmailEmail, gmailPassword);
  const attachment = attachmentPath ? buildAttachment(attachmentPath) : null;

  for (let i = 0; i < limited.length; i++) {
    const recipient = limited[i];
    const receiverEmail = recipient.email.trim().toLowerCase();
    const personalizedBody = personalizeBody(
      body,
      recipient.buyer_name ?? '',
      recipient.company_name ?? ''
    );

    const unsubscribeEmail = `unsubscribe@${gmailEmail.split('@')[1] || 'yourdomain.com'}`;
    const physicalAddress = '123 Export Business Rd, Suite 100, Business City, Country 12345';
    
    const textBody = `${personalizedBody}

---
If you no longer wish to receive these emails, please reply to this email with "Unsubscribe".
${physicalAddress}
`;

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #333333;">
  <div>
    ${personalizedBody.replace(/\n/g, '<br>')}
  </div>
  <br><br>
  <hr style="border: none; border-top: 1px solid #eeeeee;">
  <div style="font-size: 11px; color: #888888; text-align: left; margin-top: 15px;">
    <p>You are receiving this email because we identified you as a potential partner in the industry.</p>
    <p>${physicalAddress}</p>
    <p><a href="mailto:${gmailEmail}?subject=Unsubscribe" style="color: #888888; text-decoration: underline;">Unsubscribe from our mailing list</a></p>
  </div>
</body>
</html>`;

    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(2, 10)}@${gmailEmail.split('@')[1] || 'gmail.com'}>`;

    const mailOptions: Mail.Options = {
      from: `"Export Team" <${gmailEmail}>`,
      replyTo: gmailEmail,
      to: receiverEmail,
      subject,
      text: textBody,
      html: htmlBody,
      messageId: messageId,
      headers: {
        'X-Mailer': 'Nodemailer',
        'X-Priority': '3 (Normal)',
        'List-Unsubscribe': `<mailto:${gmailEmail}?subject=Unsubscribe>`,
      },
      ...(ccEmail ? { cc: ccEmail } : {}),
      ...(attachment ? { attachments: [attachment] } : {}),
    };

    try {
      await transport.sendMail(mailOptions);
      result.success_count++;
      result.successful.push(receiverEmail);
    } catch (err) {
      // On connection error, attempt to rebuild transport and retry once
      try {
        transport = buildTransport(gmailEmail, gmailPassword);
        await transport.sendMail(mailOptions);
        result.success_count++;
        result.successful.push(receiverEmail);
      } catch {
        result.failed_count++;
        result.failed.push(receiverEmail);
      }
    }

    // Delay between sends (convert seconds to ms)
    if (i < limited.length - 1) {
      await sleep(sendDelay * 1000);
    }
  }

  transport.close();
  return result;
}
