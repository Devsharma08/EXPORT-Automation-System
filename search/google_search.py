"""
google_search.py — Google source adapter.

Uses the Google Custom Search JSON API (or falls back to scraping
SerpAPI-style URLs) to find potential Singing Bowls buyers/importers.
"""

import logging
import re
import time
from typing import List, Dict

import requests
from bs4 import BeautifulSoup

from config import (
    SEARCH_KEYWORD,
    MAX_RESULTS_PER_SOURCE,
    BLOCKLISTED_DOMAINS,
    IMAGE_EXTENSIONS,
)

logger = logging.getLogger(__name__)

# ── Buyer-intent search queries ───────────────────────────────────────────────
QUERY_TEMPLATES = [
    '{keyword} importer',
    '{keyword} wholesale buyer',
    '{keyword} import company email',
    '{keyword} distributor contact',
    'buy {keyword} wholesale',
    '{keyword} supplier wanted',
    '{keyword} import export email site:alibaba.com',
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
)


def _is_blocked(url: str) -> bool:
    """Return True if the URL belongs to a blocklisted domain."""
    for domain in BLOCKLISTED_DOMAINS:
        if domain in url:
            return True
    return False


def _extract_emails_from_text(text: str) -> List[str]:
    """Pull raw email candidates from a block of text."""
    candidates = EMAIL_PATTERN.findall(text)
    valid = []
    for e in candidates:
        e_lower = e.lower()
        if any(e_lower.endswith(ext) for ext in IMAGE_EXTENSIONS):
            continue
        domain_part = e_lower.split("@")[-1]
        if len(domain_part) > 50:
            continue
        valid.append(e.lower())
    return list(set(valid))


def _scrape_google_results(query: str, max_results: int) -> List[Dict]:
    """
    Scrape Google search results for a query.
    Returns a list of dicts: {title, url, snippet}.
    NOTE: This is a best-effort scrape; Google may return a CAPTCHA.
    """
    results = []
    try:
        url = f"https://www.google.com/search?q={requests.utils.quote(query)}&num={max_results}"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        for g in soup.select("div.g"):
            title_tag = g.select_one("h3")
            link_tag = g.select_one("a[href]")
            snippet_tag = g.select_one("div.VwiC3b, span.st")

            title = title_tag.get_text(strip=True) if title_tag else ""
            href = link_tag["href"] if link_tag else ""
            snippet = snippet_tag.get_text(strip=True) if snippet_tag else ""

            if href.startswith("/url?q="):
                href = href.split("/url?q=")[1].split("&")[0]

            if href.startswith("http") and not _is_blocked(href):
                results.append({"title": title, "url": href, "snippet": snippet})

            if len(results) >= max_results:
                break

        time.sleep(1)  # Polite delay
    except Exception as exc:
        logger.warning("Google scrape failed for query '%s': %s", query, exc)

    return results


def _visit_and_extract(result: Dict) -> Dict:
    """Visit a search result URL and extract emails + metadata."""
    record = {
        "buyer_name": result.get("title", ""),
        "company_name": result.get("title", ""),
        "email": "",
        "website": result.get("url", ""),
        "country": "",
        "source_platform": "Google",
    }
    try:
        resp = requests.get(result["url"], headers=HEADERS, timeout=8)
        text = resp.text
        emails = _extract_emails_from_text(text)
        # Also check snippet
        emails += _extract_emails_from_text(result.get("snippet", ""))
        if emails:
            record["email"] = emails[0]  # Take first valid email
    except Exception as exc:
        logger.debug("Could not visit %s: %s", result.get("url"), exc)

    return record


def search(keyword: str = SEARCH_KEYWORD, max_results: int = MAX_RESULTS_PER_SOURCE) -> List[Dict]:
    """
    Main entry point for the Google source adapter.
    Returns a list of raw buyer record dicts (may have empty email fields).
    """
    logger.info("Google adapter: starting search for '%s'", keyword)
    all_records: List[Dict] = []
    seen_urls = set()

    for template in QUERY_TEMPLATES:
        query = template.format(keyword=keyword)
        results = _scrape_google_results(query, max_results=5)

        for r in results:
            if r["url"] in seen_urls:
                continue
            seen_urls.add(r["url"])
            record = _visit_and_extract(r)
            if record["email"]:
                all_records.append(record)

        if len(all_records) >= max_results:
            break

    logger.info("Google adapter: found %d records", len(all_records))
    return all_records[:max_results]
