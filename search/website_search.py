"""
website_search.py — Company website source adapter.

Crawls company websites that appear in search results for
Singing Bowls importers and extracts contact emails from
their contact/about pages.
"""

import logging
import re
import time
from typing import List, Dict
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from config import SEARCH_KEYWORD, MAX_RESULTS_PER_SOURCE, BLOCKLISTED_DOMAINS, IMAGE_EXTENSIONS

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

# Seed URLs — well-known B2B platforms for Singing Bowls buyers
SEED_URLS = [
    "https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText={keyword}+buyer",
    "https://www.made-in-china.com/products-search/hot-china-products/{keyword}.html",
    "https://www.hktdc.com/sourcing/hong-kong-international-trade-fair.htm",
    "https://www.kompass.com/a/singing-bowls/",
    "https://directory.fairtradeusa.org/",
]

# Contact page path patterns to try on each discovered domain
CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us", "/info", "/reach-us"]


def _is_blocked(url: str) -> bool:
    for domain in BLOCKLISTED_DOMAINS:
        if domain in url:
            return True
    return False


def _extract_emails(text: str) -> List[str]:
    return list({
        e.lower() for e in EMAIL_PATTERN.findall(text)
        if not any(e.lower().endswith(ext) for ext in IMAGE_EXTENSIONS)
        and len(e.split("@")[-1]) <= 50
    })


def _extract_mailto(soup: BeautifulSoup) -> List[str]:
    emails = []
    for link in soup.select("a[href^='mailto:']"):
        href = link.get("href", "")
        email = href.replace("mailto:", "").split("?")[0].strip().lower()
        if email and "@" in email:
            emails.append(email)
    return emails


def _crawl_contact_pages(base_url: str) -> List[str]:
    """Try known contact page paths on a domain and extract emails."""
    emails = []
    parsed = urlparse(base_url)
    base = f"{parsed.scheme}://{parsed.netloc}"

    for path in CONTACT_PATHS:
        try:
            url = base + path
            resp = requests.get(url, headers=HEADERS, timeout=8)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                emails += _extract_mailto(soup)
                emails += _extract_emails(soup.get_text())
                if emails:
                    break
            time.sleep(0.5)
        except Exception:
            pass

    return list(set(emails))


def _scrape_seed(url: str, keyword: str) -> List[Dict]:
    """Scrape a seed URL and extract company/buyer records."""
    records = []
    try:
        full_url = url.format(keyword=requests.utils.quote(keyword))
        resp = requests.get(full_url, headers=HEADERS, timeout=12)
        soup = BeautifulSoup(resp.text, "lxml")

        # Collect all outbound links to company websites
        seen_domains = set()
        for link in soup.select("a[href]"):
            href = link.get("href", "")
            if not href.startswith("http"):
                href = urljoin(full_url, href)
            parsed = urlparse(href)
            domain = parsed.netloc
            if not domain or _is_blocked(href) or domain in seen_domains:
                continue
            seen_domains.add(domain)

            # Crawl the company's contact pages
            emails = _crawl_contact_pages(href)
            company_text = link.get_text(strip=True)[:80]

            for email in emails[:2]:
                records.append({
                    "buyer_name": "",
                    "company_name": company_text,
                    "email": email,
                    "website": href,
                    "country": "",
                    "source_platform": "Website",
                })

            if len(records) >= 5:
                break

        time.sleep(1)
    except Exception as exc:
        logger.warning("Website seed scrape failed for %s: %s", url, exc)

    return records


def search(keyword: str = SEARCH_KEYWORD, max_results: int = MAX_RESULTS_PER_SOURCE) -> List[Dict]:
    """
    Main entry point for the company website source adapter.
    Returns buyer record dicts.
    """
    logger.info("Website adapter: starting search for '%s'", keyword)
    all_records: List[Dict] = []

    for seed_url in SEED_URLS:
        if len(all_records) >= max_results:
            break
        records = _scrape_seed(seed_url, keyword)
        all_records.extend(records)

    logger.info("Website adapter: found %d records", len(all_records))
    return all_records[:max_results]
