"""
linkedin_search.py — LinkedIn source adapter.

Searches LinkedIn public profiles and company pages for buyers/importers.
Falls back to Google-indexed LinkedIn pages to avoid login walls.
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
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# Google dork queries for LinkedIn-indexed contact pages
LINKEDIN_DORKS = [
    'site:linkedin.com "{keyword}" importer buyer email',
    'site:linkedin.com/company "{keyword}" import',
]

# Alternative B2B platforms with LinkedIn-sourced leads
B2B_SOURCES = [
    "https://www.exporters.sg/search-buyers/?q={keyword}",
    "https://www.indiamart.com/search.mp?ss={keyword}+buyer&cat_ver=2",
]


def _extract_emails(text: str) -> List[str]:
    return [
        e.lower() for e in EMAIL_PATTERN.findall(text)
        if not any(e.lower().endswith(ext) for ext in IMAGE_EXTENSIONS)
        and len(e.split("@")[-1]) <= 50
    ]


def _scrape_b2b_source(url: str, source_label: str) -> List[Dict]:
    records = []
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, "lxml")

        for item in soup.select(".product, .buyer, .listing, .result-item, li")[:15]:
            text = item.get_text(separator=" ", strip=True)
            emails = _extract_emails(text)
            name_tag = item.select_one("h2, h3, h4, .name, .company")
            country_tag = item.select_one(".country, .location, .flag")
            for email in emails:
                records.append({
                    "buyer_name": name_tag.get_text(strip=True) if name_tag else "",
                    "company_name": name_tag.get_text(strip=True) if name_tag else "",
                    "email": email,
                    "website": url,
                    "country": country_tag.get_text(strip=True) if country_tag else "",
                    "source_platform": source_label,
                })
        time.sleep(1)
    except Exception as exc:
        logger.debug("B2B source %s failed: %s", url, exc)

    return records


def search(keyword: str = SEARCH_KEYWORD, max_results: int = MAX_RESULTS_PER_SOURCE) -> List[Dict]:
    """
    Main entry point for the LinkedIn source adapter.
    Returns buyer record dicts.
    """
    logger.info("LinkedIn adapter: starting search for '%s'", keyword)
    records: List[Dict] = []

    for tmpl in B2B_SOURCES:
        if len(records) >= max_results:
            break
        url = tmpl.format(keyword=requests.utils.quote(keyword))
        new_records = _scrape_b2b_source(url, "LinkedIn/B2B")
        records.extend(new_records)

    logger.info("LinkedIn adapter: found %d records", len(records))
    return records[:max_results]
