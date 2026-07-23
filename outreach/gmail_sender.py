"""
gmail_sender.py — Email composition and dispatch module.

Implements Algorithm 12.3 from the spec:
  1. Select CSV(s) for the chosen audience
  2. De-duplicate the email list
  3. Optionally attach the presentation
  4. Connect via SMTP_SSL + login
  5. For each recipient: build message, send, log result
  6. Auto-reconnect on SMTPServerDisconnected and retry
  7. Return report_data dict
"""

import logging
import smtplib
import time
from email.message import EmailMessage
from typing import List, Dict, Optional

from config import (
    GMAIL_EMAIL,
    GMAIL_APP_PASSWORD,
    CC_EMAIL,
    SEND_DELAY_SECONDS,
    DAILY_SEND_LIMIT,
)
from outreach.gmail_auth import create_smtp_connection, reconnect, GmailAuthError
from outreach.attachment_handler import attach_presentation

logger = logging.getLogger(__name__)


def _build_message(
    sender: str,
    receiver: str,
    subject: str,
    body: str,
    cc: str,
    attachment_path: Optional[str],
    buyer_name: str = "",
    company_name: str = "",
) -> EmailMessage:
    """Compose a personalized MIME email with optional attachment."""
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = receiver
    msg["Subject"] = subject
    if cc:
        msg["Cc"] = cc

    # Personalize the body
    name_placeholder = buyer_name or company_name or "Sir/Madam"
    personalized_body = body.replace("{name}", name_placeholder).replace(
        "{company}", company_name or "your company"
    )

    msg.set_content(personalized_body)

    # Attach presentation if provided
    if attachment_path:
        attach_presentation(msg, attachment_path)

    return msg


def send_campaign(
    subject: str,
    body: str,
    recipients: List[Dict],
    attachment_path: Optional[str] = None,
    gmail_email: str = GMAIL_EMAIL,
    gmail_password: str = GMAIL_APP_PASSWORD,
    cc_email: str = CC_EMAIL,
    send_delay: float = SEND_DELAY_SECONDS,
    daily_limit: int = DAILY_SEND_LIMIT,
) -> Dict:
    """
    Send the outreach campaign to a list of recipient dicts.

    Args:
        subject: Email subject line.
        body: Email body text (supports {name} and {company} placeholders).
        recipients: List of buyer record dicts with at least an 'email' key.
        attachment_path: Path to the attachment file (None = no attachment).
        gmail_email: Sending Gmail address.
        gmail_password: Gmail App Password.
        cc_email: Address to CC on every send (for monitoring).
        send_delay: Seconds to wait between sends.
        daily_limit: Maximum emails to send in one run.

    Returns:
        report_data dict: {total, success_count, failed_count, successful[], failed[]}
    """
    # ── De-duplicate recipients ───────────────────────────────────────────────
    seen = set()
    unique_recipients = []
    for r in recipients:
        email = r.get("email", "").strip().lower()
        if email and email not in seen:
            seen.add(email)
            unique_recipients.append(r)

    if not unique_recipients:
        logger.warning("No recipients — campaign aborted.")
        return {"total": 0, "success_count": 0, "failed_count": 0,
                "successful": [], "failed": [], "error": "No recipients found."}

    # Apply daily send limit
    unique_recipients = unique_recipients[:daily_limit]
    total = len(unique_recipients)

    logger.info("Campaign starting: %d recipients", total)

    # ── Initialize report ─────────────────────────────────────────────────────
    report_data = {
        "total": total,
        "success_count": 0,
        "failed_count": 0,
        "successful": [],
        "failed": [],
    }

    # ── Establish SMTP connection ─────────────────────────────────────────────
    try:
        smtp = create_smtp_connection(gmail_email, gmail_password)
    except GmailAuthError as exc:
        logger.error("Cannot send campaign: %s", exc)
        return {**report_data, "error": str(exc)}

    # ── Send loop ─────────────────────────────────────────────────────────────
    for idx, recipient in enumerate(unique_recipients, start=1):
        receiver_email = recipient.get("email", "")
        buyer_name = recipient.get("buyer_name", "")
        company_name = recipient.get("company_name", "")

        logger.info("[%d/%d] Sending to: %s", idx, total, receiver_email)

        try:
            msg = _build_message(
                sender=gmail_email,
                receiver=receiver_email,
                subject=subject,
                body=body,
                cc=cc_email,
                attachment_path=attachment_path,
                buyer_name=buyer_name,
                company_name=company_name,
            )

            try:
                smtp.send_message(msg)
            except smtplib.SMTPServerDisconnected:
                # Auto-reconnect and retry once
                logger.warning("SMTP disconnected — reconnecting…")
                smtp = reconnect(gmail_email, gmail_password)
                smtp.send_message(msg)

            report_data["success_count"] += 1
            report_data["successful"].append(receiver_email)
            logger.info("✓ Sent to %s", receiver_email)

            time.sleep(send_delay)

        except Exception as exc:
            report_data["failed_count"] += 1
            report_data["failed"].append(receiver_email)
            logger.error("✗ Failed to send to %s: %s", receiver_email, exc)

    # ── Close connection ──────────────────────────────────────────────────────
    try:
        smtp.quit()
    except Exception:
        pass

    logger.info(
        "Campaign complete: %d sent, %d failed",
        report_data["success_count"],
        report_data["failed_count"],
    )
    return report_data
