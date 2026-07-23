"""
directory_search.py — Business directory source adapter.

Searches well-known B2B/trade directories for Singing Bowls buyers:
- Alibaba (buyer leads)
- TradeIndia
- ExportHub
- Made-in-China buyer section
- EC21 buyers
"""

import logging
import re
import time
from typing import List, Dict

import requests
from bs4 import BeautifulSoup

from config import SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE, IMAGE_EXTENSIONS

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

DIRECTORY_SOURCES = [
    {
        "name": "TradeIndia",
        "url": "https://www.tradeindia.com/search.html?v=Singing+Bowls&type=buyers",
        "item_selectors": [".company-name-title", ".company-card"],
        "email_selectors": [".email", "a[href^='mailto:']"],
        "country_selectors": [".country-name", ".location"],
    },
    {
        "name": "ExportHub",
        "url": "https://www.exporthub.com/search/?q={keyword}&type=buyers",
        "item_selectors": [".buyer-card", ".result-card"],
        "email_selectors": ["a[href^='mailto:']", ".email"],
        "country_selectors": [".country", ".flag-text"],
    },
    {
        "name": "EC21",
        "url": "https://www.ec21.com/search/?q={keyword}&type=buying-leads",
        "item_selectors": [".buying_lead", ".lead-item"],
        "email_selectors": ["a[href^='mailto:']"],
        "country_selectors": [".country"],
    },
    {
        "name": "GlobalSpec",
        "url": "https://www.globaltradeatlas.com/en/search?query={keyword}+buyers",
        "item_selectors": [".result", ".company"],
        "email_selectors": [".email", "a[href^='mailto:']"],
        "country_selectors": [".country"],
    },
]


def _extract_mailto_emails(soup: BeautifulSoup) -> List[str]:
    """Extract emails from mailto: links."""
    emails = []
    for link in soup.select("a[href^='mailto:']"):
        href = link.get("href", "")
        email = href.replace("mailto:", "").split("?")[0].strip().lower()
        if email and "@" in email:
            emails.append(email)
    return emails


def _extract_text_emails(text: str) -> List[str]:
    return [
        e.lower() for e in EMAIL_PATTERN.findall(text)
        if not any(e.lower().endswith(ext) for ext in IMAGE_EXTENSIONS)
        and len(e.split("@")[-1]) <= 50
    ]


def _scrape_directory(source: Dict, keyword: str) -> List[Dict]:
    """Scrape a single directory source and return buyer records."""
    records = []
    url = source["url"].format(keyword=requests.utils.quote(keyword))

    try:
        resp = requests.get(url, headers=HEADERS, timeout=12)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        # Try to find structured listing items
        items = []
        for selector in source.get("item_selectors", []):
            items = soup.select(selector)
            if items:
                break

        if not items:
            # Fallback: extract emails from full page text
            all_emails = _extract_mailto_emails(soup) + _extract_text_emails(soup.get_text())
            for email in list(set(all_emails))[:5]:
                records.append({
                    "buyer_name": "",
                    "company_name": "",
                    "email": email,
                    "website": url,
                    "country": "",
                    "source_platform": source["name"],
                })
        else:
            for item in items[:10]:
                item_text = item.get_text(separator=" ", strip=True)
                emails = _extract_mailto_emails(item) + _extract_text_emails(item_text)

                company = ""
                for sel in [".company-name", ".name", "h2", "h3", "h4"]:
                    tag = item.select_one(sel)
                    if tag:
                        company = tag.get_text(strip=True)
                        break

                country = ""
                for sel in source.get("country_selectors", []):
                    tag = item.select_one(sel)
                    if tag:
                        country = tag.get_text(strip=True)
                        break

                for email in list(set(emails))[:2]:
                    records.append({
                        "buyer_name": "",
                        "company_name": company,
                        "email": email,
                        "website": url,
                        "country": country,
                        "source_platform": source["name"],
                    })

        time.sleep(1.5)
    except Exception as exc:
        logger.warning("Directory '%s' scrape failed: %s", source["name"], exc)

    return records


def search(keyword: str = SEARCH_KEYWORD, max_results: int = MAX_RESULTS_PER_SOURCE) -> List[Dict]:
    """
    Main entry point for the business directory source adapter.
    Returns buyer record dicts.
    """
    logger.info("Directory adapter: starting search for '%s'", keyword)
    all_records: List[Dict] = []

    for source in DIRECTORY_SOURCES:
        if len(all_records) >= max_results:
            break
        records = _scrape_directory(source, keyword)
        all_records.extend(records)

    logger.info("Directory adapter: found %d records", len(all_records))
    return all_records[:max_results]
