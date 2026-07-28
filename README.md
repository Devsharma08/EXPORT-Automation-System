# 🎵 EXPORT Automation System

A full-stack **Next.js (TypeScript)** pipeline for automated buyer discovery and Gmail outreach for a Singing Bowls export business.

> **v2.0** — Fully migrated from Python/Flask to Next.js 16 + TypeScript. No Python runtime required.

## Features

| Feature | Details |
|---|---|
| Multi-source discovery | Google, Facebook, LinkedIn, Directories, Company Websites |
| AI Classification | Gemini API — business vs individual segmentation |
| Gmail Outreach | nodemailer SMTP SSL, auto-reconnect, duplicate prevention |
| Web Dashboard | 6-page Next.js UI with premium dark design |
| Reporting | CSV export, success rate tracking |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure credentials
cp .env.example .env   # then fill in your credentials

# 3. Place your presentation (optional)
cp /path/to/catalogue.pdf assets/company_presentation.pdf

# 4. Run the dev server
npm run dev
# → Open http://localhost:3000
```

## Environment Variables

```env
GMAIL_EMAIL=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
GEMINI_API_KEY=AIza...
SEARCH_KEYWORD=Singing Bowls
DAILY_SEND_LIMIT=100
SEND_DELAY_SECONDS=2
MAX_RESULTS_PER_SOURCE=20
PRESENTATION_PATH=assets/company_presentation.pdf
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
| `/api/report/download` | Stream CSV report download |

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Dashboard
│   │   ├── upload/page.tsx           # Upload Leads
│   │   ├── classify/page.tsx         # AI Classify
│   │   ├── send/page.tsx             # Send Campaign
│   │   ├── report/page.tsx           # View Report
│   │   ├── settings/page.tsx         # Settings
│   │   ├── globals.css               # Premium dark design system
│   │   └── api/                      # REST API routes
│   │       ├── stats/
│   │       ├── buyers/
│   │       ├── buyers/upload/
│   │       ├── classify/
│   │       ├── send/
│   │       ├── report/
│   │       ├── report/download/
│   │       ├── settings/
│   │       ├── search/
│   │       └── search/status/
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── FlashMessages.tsx
│   │   ├── UploadClient.tsx
│   │   ├── ClassifyClient.tsx
│   │   ├── SendClient.tsx
│   │   └── SettingsClient.tsx
│   ├── lib/
│   │   ├── config.ts                 # Central configuration
│   │   ├── data/
│   │   │   ├── activityLogger.ts     # All CSV read/write operations
│   │   │   └── settingsHelper.ts     # settings.json read/write
│   │   ├── validation/
│   │   │   └── emailValidator.ts     # Regex + disposable domain filter
│   │   ├── extraction/
│   │   │   └── dataExtractor.ts      # Normalizes raw results
│   │   ├── search/
│   │   │   ├── googleSearch.ts
│   │   │   ├── facebookSearch.ts
│   │   │   ├── linkedinSearch.ts
│   │   │   ├── directorySearch.ts
│   │   │   └── websiteSearch.ts
│   │   ├── outreach/
│   │   │   ├── gmailSender.ts        # nodemailer SMTP SSL
│   │   │   └── attachmentHandler.ts  # Presentation attachment
│   │   ├── ai/
│   │   │   └── geminiClassifier.ts   # @google/generative-ai SDK
│   │   └── reports/
│   │       └── reportGenerator.ts    # Run summary & CSV export
│   └── types/
│       └── index.ts                  # Shared TypeScript types
│
├── data/                             # CSV data files (preserved)
├── assets/                           # Presentation PDF
└── .env                              # Credentials (never commit!)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Vanilla CSS (premium dark theme) |
| Email | nodemailer (SMTP SSL port 465) |
| AI | @google/generative-ai (Gemini 1.5 Flash) |
| Web Scraping | fetch + cheerio |
| CSV | csv-parse / csv-stringify |
| Data Store | CSV files (buyers.csv, sent_log.csv) |

## Gmail Setup

1. Enable **2-Step Verification** on your Gmail account
2. Go to **Google Account → Security → App Passwords**
3. Generate an App Password for "Mail"
4. Copy the 16-character password to `.env`

## Architecture

```
Lead Discovery → Extraction → Validation → AI Classification → Gmail Outreach → Report
     ↑                                                                              ↓
  5 Sources                                                                   CSV Export
(fetch + cheerio)                                                         (csv-stringify)
```

## Known Limitations

- LinkedIn/Facebook scraping is best-effort (both platforms resist bots)
- CSV storage is not suitable for very large buyer lists
- No unsubscribe link (add before commercial-scale use)
- Gmail free accounts: ~500 emails/day limit

## License

Internal business tool — not for redistribution.
