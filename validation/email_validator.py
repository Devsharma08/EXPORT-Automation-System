"""
email_validator.py — Regex-based email validation module.

Filters extracted email addresses before they are accepted into
the outreach queue. Flags invalid records for manual review rather
than silently discarding them.
"""

import logging
import re
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)

# ── Regex Patterns ────────────────────────────────────────────────────────────

# RFC 5322-inspired email regex (practical subset)
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
)

# Disposable / throwaway email domains to block
DISPOSABLE_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwam.com",
    "yopmail.com", "trashmail.com", "fakeinbox.com", "sharklasers.com",
    "guerrillamailblock.com", "spam4.me", "dispostable.com", "maildrop.cc",
    "10minutemail.com", "temp-mail.org", "getnada.com", "mailnull.com",
    "spamgourmet.com", "trashmail.me", "discard.email",
}

# Placeholder / test email patterns to reject
PLACEHOLDER_PATTERNS = re.compile(
    r"(example|test|noreply|no-reply|donotreply|do-not-reply|info@example|"
    r"user@domain|email@email|sample|placeholder|dummy|fake|admin@localhost)",
    re.IGNORECASE,
)

# File extension false-positives (images embedded in CSS, etc.)
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg", ".webp", ".ico", ".tiff"}


def _is_valid_syntax(email: str) -> bool:
    """Check that the email matches the expected local@domain.tld pattern."""
    return bool(EMAIL_REGEX.match(email))


def _is_disposable(email: str) -> bool:
    """Return True if the email domain is a known disposable provider."""
    domain = email.split("@")[-1].lower()
    return domain in DISPOSABLE_DOMAINS


def _is_placeholder(email: str) -> bool:
    """Return True if the email matches common placeholder patterns."""
    return bool(PLACEHOLDER_PATTERNS.search(email))


def _is_image_extension(email: str) -> bool:
    """Return True if the email local-part ends with an image file extension."""
    local = email.split("@")[0].lower()
    return any(local.endswith(ext.lstrip(".")) for ext in IMAGE_EXTENSIONS)


def _domain_too_long(email: str) -> bool:
    """Return True if the domain part exceeds 50 characters (likely garbage)."""
    return len(email.split("@")[-1]) > 50


def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate a single email address.

    Returns:
        (is_valid: bool, reason: str)  — reason is empty string if valid.
    """
    if not email or not isinstance(email, str):
        return False, "Empty or non-string email"

    email = email.strip().lower()

    if not _is_valid_syntax(email):
        return False, f"Invalid syntax: {email}"
    if _is_image_extension(email):
        return False, f"Image extension false-positive: {email}"
    if _domain_too_long(email):
        return False, f"Domain too long: {email}"
    if _is_disposable(email):
        return False, f"Disposable domain: {email}"
    if _is_placeholder(email):
        return False, f"Placeholder email: {email}"

    return True, ""


def validate_records(records: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
    """
    Split a list of buyer records into valid and invalid buckets.

    Args:
        records: List of normalized buyer record dicts.

    Returns:
        (valid_records, invalid_records)
    """
    valid: List[Dict] = []
    invalid: List[Dict] = []

    for record in records:
        email = record.get("email", "")
        is_valid, reason = validate_email(email)

        if is_valid:
            valid.append(record)
        else:
            flagged = dict(record)
            flagged["validation_error"] = reason
            invalid.append(flagged)
            logger.debug("Invalid email '%s': %s", email, reason)

    logger.info(
        "Validation: %d valid, %d invalid out of %d records",
        len(valid), len(invalid), len(records),
    )
    return valid, invalid


def filter_already_sent(
    valid_records: List[Dict], sent_emails: set
) -> Tuple[List[Dict], List[Dict]]:
    """
    Remove records whose email has already been contacted.

    Args:
        valid_records: Valid buyer records.
        sent_emails: Set of emails already in sent_log.csv.

    Returns:
        (new_records, duplicate_records)
    """
    new_records = []
    duplicates = []

    for record in valid_records:
        email = record.get("email", "")
        if email in sent_emails:
            duplicates.append(record)
        else:
            new_records.append(record)

    logger.info(
        "Duplicate filter: %d new, %d already sent",
        len(new_records), len(duplicates),
    )
    return new_records, duplicates
