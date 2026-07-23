"""
report_generator.py — Builds run summary reports.

Generates both an in-memory report_data dict and a downloadable
CSV report from the sent_log.csv.
"""

import csv
import io
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from logging_module.activity_logger import read_sent_log, get_database_stats

logger = logging.getLogger(__name__)


def build_run_report(report_data: Optional[Dict] = None) -> Dict:
    """
    Build a comprehensive report combining the latest campaign results
    with cumulative database statistics.

    Args:
        report_data: The report_data dict from the most recent campaign send.
                     If None, builds a historical summary from sent_log.csv.

    Returns:
        A fully populated report dict.
    """
    stats = get_database_stats()
    sent_log = read_sent_log()

    if report_data:
        total = report_data.get("total", 0)
        success = report_data.get("success_count", 0)
        failed = report_data.get("failed_count", 0)
        rate = round((success / total * 100), 1) if total > 0 else 0.0

        return {
            "run_type": "campaign",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_recipients": total,
            "success_count": success,
            "failed_count": failed,
            "success_rate": rate,
            "successful_emails": report_data.get("successful", []),
            "failed_emails": report_data.get("failed", []),
            **stats,
        }

    # Historical summary
    total_sent = stats["total_sent"]
    success_count = stats["sent_success"]
    failed_count = stats["sent_failed"]
    rate = round((success_count / total_sent * 100), 1) if total_sent > 0 else 0.0

    return {
        "run_type": "historical",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_recipients": total_sent,
        "success_count": success_count,
        "failed_count": failed_count,
        "success_rate": rate,
        "successful_emails": [],
        "failed_emails": [],
        **stats,
    }


def generate_csv_report(report_data: Optional[Dict] = None) -> str:
    """
    Generate a downloadable CSV report from the sent_log.csv data.

    Args:
        report_data: Optional latest campaign result dict.

    Returns:
        CSV content as a string.
    """
    sent_log = read_sent_log()
    output = io.StringIO()

    fieldnames = ["email", "status", "timestamp", "subject"]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(sent_log)

    # Append summary rows at the bottom
    output.write("\n")
    stats = get_database_stats()
    output.write(f"# Generated: {datetime.now(timezone.utc).isoformat()}\n")
    output.write(f"# Total Buyers Discovered: {stats['total_buyers']}\n")
    output.write(f"# Total Emails Sent: {stats['sent_success']}\n")
    output.write(f"# Total Failures: {stats['sent_failed']}\n")

    if report_data:
        rate = report_data.get("success_rate", 0)
        output.write(f"# Campaign Success Rate: {rate}%\n")

    return output.getvalue()


def print_console_report(report_data: Dict) -> None:
    """Print a formatted summary to stdout after a pipeline run."""
    print("\n" + "=" * 60)
    print("  EXPORT AUTOMATION SYSTEM — RUN REPORT")
    print("=" * 60)
    print(f"  Generated:          {report_data.get('generated_at', 'N/A')}")
    print(f"  Total Recipients:   {report_data.get('total_recipients', 0)}")
    print(f"  Sent Successfully:  {report_data.get('success_count', 0)}")
    print(f"  Failed:             {report_data.get('failed_count', 0)}")
    print(f"  Success Rate:       {report_data.get('success_rate', 0)}%")
    print(f"  Total Buyers DB:    {report_data.get('total_buyers', 0)}")
    print("=" * 60 + "\n")
