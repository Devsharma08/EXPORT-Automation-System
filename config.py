"""
config.py — Central configuration for the EXPORT Automation System.
All runtime behaviour is controlled from here or from .env.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Search Settings ──────────────────────────────────────────────────────────
SEARCH_KEYWORD = os.getenv("SEARCH_KEYWORD", "Singing Bowls")
MAX_RESULTS_PER_SOURCE = int(os.getenv("MAX_RESULTS_PER_SOURCE", "20"))

# Enabled source adapters (set to False to disable a source)
ENABLED_SOURCES = {
    "google": True,
    "facebook": True,
    "linkedin": True,
    "directory": True,
    "website": True,
}

# ── Email / Outreach Settings ─────────────────────────────────────────────────
GMAIL_EMAIL = os.getenv("GMAIL_EMAIL", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
CC_EMAIL = os.getenv("CC_EMAIL", "")           # Monitoring address CC'd on every send
DAILY_SEND_LIMIT = int(os.getenv("DAILY_SEND_LIMIT", "100"))
SEND_DELAY_SECONDS = float(os.getenv("SEND_DELAY_SECONDS", "2"))  # Delay between sends

# ── SMTP Configuration ────────────────────────────────────────────────────────
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT_TLS = 587
SMTP_PORT_SSL = 465

# ── File Paths ────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
ASSETS_DIR = os.path.join(BASE_DIR, "assets")

BUYERS_CSV = os.path.join(DATA_DIR, "buyers.csv")
SENT_LOG_CSV = os.path.join(DATA_DIR, "sent_log.csv")
BUSINESS_EMAILS_CSV = os.path.join(DATA_DIR, "business_emails.csv")
INDIVIDUAL_EMAILS_CSV = os.path.join(DATA_DIR, "individual_emails.csv")
SETTINGS_JSON = os.path.join(DATA_DIR, "settings.json")

PRESENTATION_PATH = os.getenv(
    "PRESENTATION_PATH",
    os.path.join(ASSETS_DIR, "company_presentation.pdf"),
)

# ── AI / Gemini Settings ──────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-1.5-flash"
CLASSIFICATION_BATCH_SIZE = 20  # Emails per Gemini API call

# ── Allowed Attachment Extensions ─────────────────────────────────────────────
ALLOWED_ATTACHMENT_EXTENSIONS = {".pdf", ".pptx", ".ppt", ".docx", ".doc"}

# ── Blocklisted Domains (never scrape / extract from) ────────────────────────
BLOCKLISTED_DOMAINS = {
    "google.com", "gstatic.com", "googleapis.com",
    "facebook.com", "fb.com",
    "linkedin.com",
    "youtube.com", "youtu.be",
    "twitter.com", "x.com",
    "wikipedia.org",
    "amazon.com", "ebay.com",
}

# ── Image Extensions (skip emails ending in these) ────────────────────────────
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg", ".webp", ".ico"}

# ── CSV Column Schemas ────────────────────────────────────────────────────────
BUYERS_COLUMNS = [
    "buyer_name",
    "company_name",
    "email",
    "website",
    "country",
    "source_platform",
    "discovered_at",
]

SENT_LOG_COLUMNS = ["email", "status", "timestamp", "subject"]

BUSINESS_COLS = ["email"]
INDIVIDUAL_COLS = ["email"]
