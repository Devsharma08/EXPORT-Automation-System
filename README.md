# 🎵 API 3 — EXPORT Automation System

A two-stage pipeline for **automated buyer discovery** and **Gmail outreach** for a Singing Bowls export business.

## Features

| Feature | Details |
|---|---|
| Multi-source discovery | Google, Facebook, LinkedIn, Directories, Company Websites |
| AI Classification | Gemini API — business vs individual segmentation |
| Gmail Outreach | SMTP SSL, auto-reconnect, duplicate prevention |
| Web Dashboard | 7-route Flask UI with premium dark design |
| Reporting | CSV export, success rate tracking |

## Quick Start

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure credentials
cp .env .env.local   # then fill in your credentials
#   GMAIL_EMAIL=your@gmail.com
#   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
#   GEMINI_API_KEY=AIza...

# 4. Place your presentation
cp /path/to/catalogue.pdf assets/company_presentation.pdf

# 5. Run the web app
python app.py
# → Open http://localhost:5000

# OR run the CLI pipeline directly
python main.py --dry-run
```

## Web Interface Routes

| Route | Description |
|---|---|
| `/` | Dashboard — stats, pipeline status, system health |
| `/upload` | Upload buyer CSV or view database |
| `/classify` | AI classification (business / individual) |
| `/send` | Compose and launch email campaign |
| `/report` | View report + download CSV |
| `/settings` | Configure Gmail, Gemini API, campaign defaults |
| `/download-report` | Stream CSV report download |

## Project Structure

```
export-automation/
├── app.py                    # Flask web app (7 routes)
├── main.py                   # CLI pipeline orchestrator
├── config.py                 # Central configuration
├── .env                      # Credentials (never commit!)
│
├── search/                   # Source adapters
│   ├── google_search.py
│   ├── facebook_search.py
│   ├── linkedin_search.py
│   ├── directory_search.py
│   └── website_search.py
│
├── extraction/
│   └── data_extractor.py     # Normalizes raw results
│
├── validation/
│   └── email_validator.py    # Regex + disposable domain filter
│
├── outreach/
│   ├── gmail_auth.py         # SMTP SSL authentication
│   ├── gmail_sender.py       # Email composition & dispatch
│   └── attachment_handler.py # Presentation attachment
│
├── logging_module/
│   └── activity_logger.py    # All CSV read/write operations
│
├── reports/
│   └── report_generator.py   # Run summary & CSV export
│
├── templates/                # Jinja2 HTML templates
├── static/                   # CSS & JS
├── data/                     # CSV data files
└── assets/                   # Presentation PDF
```

## Gmail Setup

1. Enable **2-Step Verification** on your Gmail account
2. Go to **Google Account → Security → App Passwords**
3. Generate an App Password for "Mail"
4. Copy the 16-character password to `.env`

## Environment Variables

```env
GMAIL_EMAIL=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
GEMINI_API_KEY=AIza...
SEARCH_KEYWORD=Singing Bowls
DAILY_SEND_LIMIT=100
SEND_DELAY_SECONDS=2
PRESENTATION_PATH=assets/company_presentation.pdf
```

## Architecture

```
Lead Discovery → Extraction → Validation → AI Classification → Gmail Outreach → Report
     ↑                                                                              ↓
  5 Sources                                                                   CSV Export
```

## Known Limitations

- LinkedIn/Facebook scraping is best-effort (both platforms resist bots)
- CSV storage is not suitable for very large buyer lists
- No unsubscribe link (add before commercial-scale use)
- Gmail free accounts: ~500 emails/day limit

## License

Internal business tool — not for redistribution.
