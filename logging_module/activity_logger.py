"""
activity_logger.py — Single point of truth for all CSV read/write operations.

Handles:
- buyers.csv    (discovered buyer records)
- sent_log.csv  (outreach history / duplicate-prevention)
- business_emails.csv
- individual_emails.csv
"""

import csv
import logging
import os
from datetime import datetime, timezone
from typing import List, Dict, Set

import pandas as pd

from config import (
    BUYERS_CSV,
    SENT_LOG_CSV,
    BUSINESS_EMAILS_CSV,
    INDIVIDUAL_EMAILS_CSV,
    BUYERS_COLUMNS,
    SENT_LOG_COLUMNS,
)

logger = logging.getLogger(__name__)


# ── Utility Helpers ───────────────────────────────────────────────────────────

def _ensure_file(path: str, columns: List[str]) -> None:
    """Create a CSV with headers if it doesn't exist or is empty."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=columns)
            writer.writeheader()


def _read_csv(path: str, columns: List[str]) -> pd.DataFrame:
    """Read a CSV into a DataFrame, ensuring it exists first."""
    _ensure_file(path, columns)
    try:
        df = pd.read_csv(path, dtype=str)
        # Add any missing columns
        for col in columns:
            if col not in df.columns:
                df[col] = ""
        return df[columns]
    except Exception as exc:
        logger.error("Could not read %s: %s", path, exc)
        return pd.DataFrame(columns=columns)


# ── Buyers CSV ────────────────────────────────────────────────────────────────

def read_buyers() -> List[Dict]:
    """Read all buyer records from buyers.csv."""
    df = _read_csv(BUYERS_CSV, BUYERS_COLUMNS)
    return df.to_dict(orient="records")


def append_buyers(records: List[Dict]) -> int:
    """
    Append new buyer records to buyers.csv (deduplicates by email).

    Returns:
        Number of records actually written.
    """
    if not records:
        return 0

    _ensure_file(BUYERS_CSV, BUYERS_COLUMNS)

    # Read existing emails
    existing = _read_csv(BUYERS_CSV, BUYERS_COLUMNS)
    existing_emails = set(existing["email"].str.lower().dropna())

    new_rows = [r for r in records if r.get("email", "").lower() not in existing_emails]

    if not new_rows:
        logger.info("No new buyers to append (all duplicates).")
        return 0

    with open(BUYERS_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=BUYERS_COLUMNS, extrasaction="ignore")
        for row in new_rows:
            writer.writerow(row)

    logger.info("Appended %d new buyers to %s", len(new_rows), BUYERS_CSV)
    return len(new_rows)


def get_all_buyer_emails() -> Set[str]:
    """Return a set of all email addresses in buyers.csv."""
    df = _read_csv(BUYERS_CSV, BUYERS_COLUMNS)
    return set(df["email"].str.lower().dropna())


# ── Sent Log CSV ──────────────────────────────────────────────────────────────

def read_sent_log() -> List[Dict]:
    """Read all records from sent_log.csv."""
    df = _read_csv(SENT_LOG_CSV, SENT_LOG_COLUMNS)
    return df.to_dict(orient="records")


def get_sent_emails() -> Set[str]:
    """Return a set of emails already in the sent log."""
    df = _read_csv(SENT_LOG_CSV, SENT_LOG_COLUMNS)
    return set(df["email"].str.lower().dropna())


def log_send_attempt(email: str, status: str, subject: str = "") -> None:
    """
    Append a single send attempt to sent_log.csv.

    Args:
        email: Recipient email address.
        status: "sent" or "failed".
        subject: Email subject for reference.
    """
    _ensure_file(SENT_LOG_CSV, SENT_LOG_COLUMNS)
    row = {
        "email": email.lower().strip(),
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "subject": subject,
    }
    with open(SENT_LOG_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=SENT_LOG_COLUMNS)
        writer.writerow(row)


def log_campaign_results(report_data: Dict, subject: str = "") -> None:
    """
    Bulk-log the results of a completed campaign to sent_log.csv.

    Args:
        report_data: The report_data dict from gmail_sender.send_campaign().
        subject: Email subject for reference.
    """
    for email in report_data.get("successful", []):
        log_send_attempt(email, "sent", subject)
    for email in report_data.get("failed", []):
        log_send_attempt(email, "failed", subject)
    logger.info(
        "Logged %d sent + %d failed to sent_log.csv",
        len(report_data.get("successful", [])),
        len(report_data.get("failed", [])),
    )


# ── Classified Email CSVs ─────────────────────────────────────────────────────

def save_classified_emails(business: List[str], individual: List[str]) -> None:
    """
    Overwrite business_emails.csv and individual_emails.csv with
    freshly classified email lists.
    """
    for path, emails in [(BUSINESS_EMAILS_CSV, business), (INDIVIDUAL_EMAILS_CSV, individual)]:
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["email"])
            for email in emails:
                writer.writerow([email.lower().strip()])
    logger.info(
        "Saved %d business + %d individual classified emails",
        len(business), len(individual),
    )


def read_classified_emails(audience: str = "all") -> List[str]:
    """
    Read classified email addresses for the requested audience.

    Args:
        audience: "business", "individual", or "all".

    Returns:
        Deduplicated list of email strings.
    """
    emails: List[str] = []

    if audience in ("business", "all"):
        df = _read_csv(BUSINESS_EMAILS_CSV, ["email"])
        emails += df["email"].dropna().str.lower().tolist()

    if audience in ("individual", "all"):
        df = _read_csv(INDIVIDUAL_EMAILS_CSV, ["email"])
        emails += df["email"].dropna().str.lower().tolist()

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for e in emails:
        if e and e not in seen:
            seen.add(e)
            unique.append(e)

    return unique


# ── Stats Helpers ─────────────────────────────────────────────────────────────

def get_database_stats() -> Dict:
    """Return a summary of the current data store."""
    buyers_df = _read_csv(BUYERS_CSV, BUYERS_COLUMNS)
    sent_df = _read_csv(SENT_LOG_CSV, SENT_LOG_COLUMNS)
    biz_df = _read_csv(BUSINESS_EMAILS_CSV, ["email"])
    ind_df = _read_csv(INDIVIDUAL_EMAILS_CSV, ["email"])

    sent_success = sent_df[sent_df["status"] == "sent"].shape[0] if not sent_df.empty else 0
    sent_failed = sent_df[sent_df["status"] == "failed"].shape[0] if not sent_df.empty else 0

    return {
        "total_buyers": len(buyers_df),
        "total_sent": len(sent_df),
        "sent_success": sent_success,
        "sent_failed": sent_failed,
        "business_emails": len(biz_df),
        "individual_emails": len(ind_df),
        "buyers_csv_size": _file_size_kb(BUYERS_CSV),
        "sent_log_size": _file_size_kb(SENT_LOG_CSV),
    }


def _file_size_kb(path: str) -> float:
    try:
        return round(os.path.getsize(path) / 1024, 1)
    except OSError:
        return 0.0
