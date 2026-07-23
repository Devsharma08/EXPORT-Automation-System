"""
data_extractor.py — Normalizes raw per-source results into the unified buyer schema.

Each search adapter returns a list of partially-filled dicts.
This module cleans, normalizes, and deduplicates those records
before handing them off to the validation layer.
"""

import logging
import re
from datetime import datetime, timezone
from typing import List, Dict

from config import BUYERS_COLUMNS

logger = logging.getLogger(__name__)

# Fields present in every normalized buyer record
REQUIRED_FIELDS = {"buyer_name", "company_name", "email", "website", "country", "source_platform"}

# Characters to strip from names / companies
_STRIP_CHARS = re.compile(r"[^\w\s\-&,.'()]", re.UNICODE)


def _clean_string(value: str) -> str:
    """Remove special characters and collapse whitespace."""
    if not value:
        return ""
    cleaned = _STRIP_CHARS.sub(" ", str(value))
    return " ".join(cleaned.split()).strip()


def _normalize_email(email: str) -> str:
    """Lowercase and strip whitespace from an email address."""
    return str(email).strip().lower()


def _normalize_record(raw: Dict) -> Dict:
    """
    Take a raw dict from a search adapter and produce a fully-structured
    buyer record with all required fields present and ISO-8601 timestamp.
    """
    return {
        "buyer_name": _clean_string(raw.get("buyer_name", "")),
        "company_name": _clean_string(raw.get("company_name", "")),
        "email": _normalize_email(raw.get("email", "")),
        "website": str(raw.get("website", "")).strip(),
        "country": _clean_string(raw.get("country", "")),
        "source_platform": _clean_string(raw.get("source_platform", "Unknown")),
        "discovered_at": datetime.now(timezone.utc).isoformat(),
    }


def _deduplicate(records: List[Dict]) -> List[Dict]:
    """Remove records with the same email address, keeping the first occurrence."""
    seen_emails = set()
    unique = []
    for r in records:
        email = r.get("email", "")
        if email and email not in seen_emails:
            seen_emails.add(email)
            unique.append(r)
        elif not email:
            # Keep records with missing emails for manual review
            unique.append(r)
    return unique


def extract(raw_records: List[Dict]) -> List[Dict]:
    """
    Normalize and deduplicate a list of raw adapter records.

    Args:
        raw_records: Unsanitized dicts from one or more search adapters.

    Returns:
        List of normalized buyer record dicts matching BUYERS_COLUMNS schema.
    """
    logger.info("Extractor: processing %d raw records", len(raw_records))

    normalized = [_normalize_record(r) for r in raw_records]
    unique = _deduplicate(normalized)

    logger.info("Extractor: %d records after deduplication", len(unique))
    return unique


def merge_with_existing(new_records: List[Dict], existing_records: List[Dict]) -> List[Dict]:
    """
    Merge new records with existing ones, deduplicating by email.

    Args:
        new_records: Freshly extracted records.
        existing_records: Records already in buyers.csv.

    Returns:
        Combined list without duplicates.
    """
    existing_emails = {r.get("email", "") for r in existing_records if r.get("email")}
    merged = list(existing_records)

    added = 0
    for record in new_records:
        email = record.get("email", "")
        if email and email not in existing_emails:
            merged.append(record)
            existing_emails.add(email)
            added += 1

    logger.info("Merge: added %d new records to %d existing", added, len(existing_records))
    return merged
