"""
main.py — Pipeline orchestrator for the EXPORT Automation System.

Executes the full buyer-discovery → validate → send → report pipeline
from the command line. The web interface (app.py) calls individual modules
directly; this script is for scripted/automated runs.

Usage:
    python main.py [--keyword "Singing Bowls"] [--no-send] [--dry-run]
"""

import argparse
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("main")


def run_pipeline(keyword: str, send_emails: bool = True, dry_run: bool = False) -> None:
    """Execute the full search → extract → validate → send → report pipeline."""

    logger.info("══════════════════════════════════════════════════")
    logger.info("  EXPORT Automation System — Pipeline Starting")
    logger.info("  Keyword: '%s'  |  Send: %s  |  Dry-run: %s", keyword, send_emails, dry_run)
    logger.info("══════════════════════════════════════════════════")

    # ── 1. Buyer Search ───────────────────────────────────────────────────────
    logger.info("STAGE 1: Buyer Search")
    from config import ENABLED_SOURCES
    from search import (
        google_search, facebook_search, linkedin_search,
        directory_search, website_search,
    )

    raw_records = []
    adapters = {
        "google": google_search,
        "facebook": facebook_search,
        "linkedin": linkedin_search,
        "directory": directory_search,
        "website": website_search,
    }

    for name, adapter in adapters.items():
        if ENABLED_SOURCES.get(name, True):
            logger.info("  Running %s adapter…", name)
            try:
                records = adapter.search(keyword=keyword)
                raw_records.extend(records)
                logger.info("  %s: %d records found", name, len(records))
            except Exception as exc:
                logger.error("  %s adapter failed: %s", name, exc)

    logger.info("Total raw records collected: %d", len(raw_records))

    # ── 2. Data Extraction & Normalization ────────────────────────────────────
    logger.info("STAGE 2: Data Extraction & Normalization")
    from extraction.data_extractor import extract
    normalized = extract(raw_records)
    logger.info("Normalized records: %d", len(normalized))

    # ── 3. Email Validation ───────────────────────────────────────────────────
    logger.info("STAGE 3: Email Validation")
    from validation.email_validator import validate_records, filter_already_sent
    from logging_module.activity_logger import get_sent_emails, append_buyers

    valid_records, invalid_records = validate_records(normalized)
    logger.info("Valid: %d  |  Invalid: %d", len(valid_records), len(invalid_records))

    # ── 4. Duplicate Check ────────────────────────────────────────────────────
    logger.info("STAGE 4: Duplicate Check")
    sent_emails = get_sent_emails()
    new_records, duplicates = filter_already_sent(valid_records, sent_emails)
    logger.info("New: %d  |  Duplicates skipped: %d", len(new_records), len(duplicates))

    # ── 5. Log to buyers.csv ──────────────────────────────────────────────────
    added = append_buyers(valid_records)
    logger.info("Buyers CSV updated: %d new records added", added)

    # ── 6. Outreach Dispatch ──────────────────────────────────────────────────
    report_data = None
    if send_emails and new_records:
        if dry_run:
            logger.info("DRY RUN — would send to %d recipients:", len(new_records))
            for r in new_records:
                logger.info("  → %s (%s)", r.get("email"), r.get("company_name", ""))
            report_data = {
                "total": len(new_records),
                "success_count": 0,
                "failed_count": 0,
                "successful": [],
                "failed": [],
                "note": "Dry run — no emails sent",
            }
        else:
            logger.info("STAGE 5: Gmail Dispatch")
            from outreach.gmail_sender import send_campaign
            from logging_module.activity_logger import log_campaign_results
            from data.settings_helper import load_settings

            settings = load_settings()
            subject = settings.get("default_subject", "Singing Bowls — Product Catalogue")
            body = settings.get("default_body", "Dear {name},\n\nPlease find our catalogue attached.")

            report_data = send_campaign(
                subject=subject,
                body=body,
                recipients=new_records,
                attachment_path=settings.get("presentation_path"),
            )
            log_campaign_results(report_data, subject)
    elif not new_records:
        logger.info("No new buyers to contact — pipeline complete.")
    else:
        logger.info("Email sending disabled — skipping dispatch stage.")

    # ── 7. Report ─────────────────────────────────────────────────────────────
    logger.info("STAGE 6: Report Generation")
    from reports.report_generator import build_run_report, print_console_report
    report = build_run_report(report_data)
    print_console_report(report)


def main() -> None:
    parser = argparse.ArgumentParser(description="EXPORT Automation System Pipeline")
    parser.add_argument("--keyword", default=None, help="Search keyword (overrides .env)")
    parser.add_argument("--no-send", action="store_true", help="Skip email dispatch stage")
    parser.add_argument("--dry-run", action="store_true", help="Show recipients without sending")
    args = parser.parse_args()

    from config import SEARCH_KEYWORD
    keyword = args.keyword or SEARCH_KEYWORD

    try:
        run_pipeline(
            keyword=keyword,
            send_emails=not args.no_send,
            dry_run=args.dry_run,
        )
    except KeyboardInterrupt:
        logger.info("Pipeline interrupted by user.")
    except Exception as exc:
        logger.critical("Pipeline failed with unhandled error: %s", exc, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
