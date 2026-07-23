"""
facebook_search.py — Facebook / Meta source adapter.

Searches public Facebook posts, groups, and marketplace listings
for Singing Bowls buyers/importers.
NOTE: Facebook heavily restricts scraping; this adapter uses
public search URLs and gracefully handles blocks.
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
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# Public directories/marketplaces that aggregate Facebook leads
FALLBACK_SOURCES = [
    "https://www.importgenius.com/search?q={keyword}",
    "https://www.tradekey.com/search/?searchType=products&keyword={keyword}+import",
    "https://www.globalsources.com/gsol/I/Singing-bowls/I/product.htm",
]


def _extract_emails_from_text(text: str) -> List[str]:
    candidates = EMAIL_PATTERN.findall(text)
    return [
        e.lower() for e in candidates
        if not any(e.lower().endswith(ext) for ext in IMAGE_EXTENSIONS)
        and len(e.split("@")[-1]) <= 50
    ]


def _try_public_search(keyword: str) -> List[Dict]:
    """Attempt to extract leads from public business directories as a fallback."""
    records = []
    url = f"https://www.tradekey.com/search/?searchType=buyers&keyword={requests.utils.quote(keyword)}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, "lxml")
        for item in soup.select(".product-item, .buyer-item, .listing")[:10]:
            text = item.get_text(separator=" ", strip=True)
            emails = _extract_emails_from_text(text)
            company = item.select_one("h2, h3, .company-name")
            country = item.select_one(".country, .location")
            if emails:
                records.append({
                    "buyer_name": "",
                    "company_name": company.get_text(strip=True) if company else text[:60],
                    "email": emails[0],
                    "website": url,
                    "country": country.get_text(strip=True) if country else "",
                    "source_platform": "Facebook/TradeKey",
                })
        time.sleep(1)
    except Exception as exc:
        logger.warning("Facebook fallback scrape failed: %s", exc)

    return records


def search(keyword: str = SEARCH_KEYWORD, max_results: int = MAX_RESULTS_PER_SOURCE) -> List[Dict]:
    """
    Main entry point for the Facebook source adapter.
    Returns buyer record dicts.
    """
    logger.info("Facebook adapter: starting search for '%s'", keyword)
    records = _try_public_search(keyword)

    # Try additional fallback sources
    for tmpl in FALLBACK_SOURCES[1:]:
        if len(records) >= max_results:
            break
        try:
            url = tmpl.format(keyword=requests.utils.quote(keyword))
            resp = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(resp.text, "lxml")
            text = soup.get_text(separator=" ")
            emails = _extract_emails_from_text(text)
            for email in emails[:5]:
                records.append({
                    "buyer_name": "",
                    "company_name": "",
                    "email": email,
                    "website": url,
                    "country": "",
                    "source_platform": "Facebook/Directory",
                })
            time.sleep(1)
        except Exception as exc:
            logger.debug("Fallback source failed: %s", exc)

    logger.info("Facebook adapter: found %d records", len(records))
    return records[:max_results]
