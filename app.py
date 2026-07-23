"""
app.py — Flask web application for the EXPORT Automation System.

Routes:
  GET  /              — Dashboard
  GET  /upload        — Upload leads / view DB stats
  POST /upload        — Process uploaded CSV
  GET  /classify      — Classify page
  POST /classify      — Run AI classification via Gemini
  GET  /send          — Send campaign page
  POST /send          — Launch campaign
  GET  /report        — View latest report
  GET  /settings      — Settings page
  POST /settings      — Save settings
  GET  /download-report — Download CSV report
  POST /search        — Trigger buyer search pipeline
"""

import io
import json
import logging
import os
import sys
import threading
from datetime import datetime
from typing import Any

import pandas as pd
from flask import (
    Flask, flash, redirect, render_template,
    request, send_file, session, url_for,
)
from werkzeug.utils import secure_filename

# ── Local imports ─────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))

from config import (
    BUYERS_CSV, SENT_LOG_CSV, BUSINESS_EMAILS_CSV, INDIVIDUAL_EMAILS_CSV,
    BUYERS_COLUMNS, SENT_LOG_COLUMNS, GEMINI_MODEL, CLASSIFICATION_BATCH_SIZE,
)
from logging_module.activity_logger import (
    read_buyers, append_buyers, get_sent_emails,
    get_database_stats, read_sent_log,
    save_classified_emails, read_classified_emails,
    log_campaign_results,
)
from reports.report_generator import build_run_report, generate_csv_report
from outreach.gmail_sender import send_campaign
from outreach.attachment_handler import get_attachment_info
from validation.email_validator import validate_records, filter_already_sent
from data.settings_helper import load_settings, save_settings

# ── Flask Setup ───────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.urandom(24)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")

# In-memory store for the most recent campaign result
_latest_report: dict = {}
_search_running: bool = False
_search_log: list = []


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _classify_with_gemini(emails: list, api_key: str) -> tuple:
    """
    Call the Gemini API to classify emails as business or individual.
    Returns (business_list, individual_list).
    """
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(GEMINI_MODEL)

        business, individual = [], []

        for i in range(0, len(emails), CLASSIFICATION_BATCH_SIZE):
            batch = emails[i: i + CLASSIFICATION_BATCH_SIZE]
            prompt = (
                "Classify each email address as 'business' or 'individual' based on the domain "
                "and local-part conventions. Business emails typically use company domains "
                "(not gmail/yahoo/hotmail/outlook), or contain company-indicative keywords. "
                "Return a JSON object mapping each email to its label.\n\n"
                f"Emails: {json.dumps(batch)}\n\n"
                'Respond ONLY with valid JSON, e.g. {"email@corp.com": "business", ...}'
            )
            response = model.generate_content(prompt)
            text = response.text.strip()

            # Extract JSON from the response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                result = json.loads(text[start:end])
                for email, label in result.items():
                    if label.lower() == "business":
                        business.append(email)
                    else:
                        individual.append(email)
            else:
                # Fallback: treat all as individual if parsing fails
                individual.extend(batch)

        return business, individual

    except Exception as exc:
        logger.error("Gemini classification error: %s", exc)
        return [], emails  # Treat all as individual on error


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Dashboard route."""
    stats = get_database_stats()
    settings = load_settings()
    attachment = get_attachment_info(settings.get("presentation_path", ""))
    return render_template("index.html", stats=stats, attachment=attachment, settings=settings)


@app.route("/upload", methods=["GET", "POST"])
def upload():
    """Upload leads CSV or view database statistics."""
    stats = get_database_stats()

    if request.method == "POST":
        if "file" not in request.files:
            flash("No file selected.", "error")
            return redirect(url_for("upload"))

        file = request.files["file"]
        if file.filename == "":
            flash("No file selected.", "error")
            return redirect(url_for("upload"))

        if not file.filename.lower().endswith(".csv"):
            flash("Only CSV files are accepted.", "error")
            return redirect(url_for("upload"))

        try:
            df = pd.read_csv(io.BytesIO(file.read()), dtype=str).fillna("")

            # Map uploaded columns to our schema (flexible matching)
            col_map = {}
            for col in df.columns:
                col_lower = col.lower().replace(" ", "_")
                for schema_col in BUYERS_COLUMNS:
                    if col_lower == schema_col or col_lower in schema_col or schema_col in col_lower:
                        col_map[col] = schema_col
                        break

            df = df.rename(columns=col_map)

            # Add missing columns
            for c in BUYERS_COLUMNS:
                if c not in df.columns:
                    df[c] = ""

            records = df[BUYERS_COLUMNS].to_dict(orient="records")
            added = append_buyers(records)

            flash(f"✓ Uploaded successfully! {added} new buyers added to database.", "success")
        except Exception as exc:
            flash(f"Error processing file: {exc}", "error")

        return redirect(url_for("upload"))

    # GET
    buyers = read_buyers()
    recent_buyers = buyers[-10:] if buyers else []
    recent_buyers.reverse()
    return render_template("upload.html", stats=stats, recent_buyers=recent_buyers)


@app.route("/classify", methods=["GET", "POST"])
def classify():
    """AI email classification route."""
    stats = get_database_stats()

    if request.method == "POST":
        settings = load_settings()
        api_key = settings.get("gemini_api_key", "")

        if not api_key:
            flash("Gemini API key not configured. Please go to Settings.", "error")
            return redirect(url_for("classify"))

        buyers = read_buyers()
        all_emails = list({r.get("email", "").lower() for r in buyers if r.get("email")})

        if not all_emails:
            flash("No emails in the database to classify. Upload buyers first.", "warning")
            return redirect(url_for("classify"))

        try:
            business, individual = _classify_with_gemini(all_emails, api_key)
            save_classified_emails(business, individual)
            flash(
                f"✓ Classification complete! {len(business)} business, "
                f"{len(individual)} individual contacts.",
                "success",
            )
        except Exception as exc:
            flash(f"Classification failed: {exc}", "error")

        return redirect(url_for("classify"))

    # GET
    biz_emails = read_classified_emails("business")
    ind_emails = read_classified_emails("individual")
    return render_template(
        "classify.html",
        stats=stats,
        biz_emails=biz_emails[:20],
        ind_emails=ind_emails[:20],
        biz_count=len(biz_emails),
        ind_count=len(ind_emails),
    )


@app.route("/send", methods=["GET", "POST"])
def send():
    """Campaign send route."""
    global _latest_report
    settings = load_settings()
    stats = get_database_stats()
    attachment = get_attachment_info(settings.get("presentation_path", ""))

    if request.method == "POST":
        subject = request.form.get("subject", "").strip()
        body = request.form.get("body", "").strip()
        audience = request.form.get("audience", "all")
        use_attachment = request.form.get("use_attachment") == "on"

        if not subject or not body:
            flash("Subject and body are required.", "error")
            return redirect(url_for("send"))

        gmail_email = settings.get("email", "")
        gmail_password = settings.get("app_password", "")
        cc_email = settings.get("cc_email", "")
        send_delay = float(settings.get("send_delay", 2))
        daily_limit = int(settings.get("daily_send_limit", 100))

        if not gmail_email or not gmail_password:
            flash("Gmail credentials not configured. Please go to Settings.", "error")
            return redirect(url_for("send"))

        # Get recipients based on audience
        audience_emails = read_classified_emails(audience)
        if not audience_emails:
            # Fall back to all buyers if no classified emails
            buyers = read_buyers()
            audience_emails = [r.get("email") for r in buyers if r.get("email")]

        if not audience_emails:
            flash("No recipients found. Upload buyers and run classification first.", "warning")
            return redirect(url_for("send"))

        # Filter already-sent
        sent_set = get_sent_emails()
        recipients = [{"email": e} for e in audience_emails if e not in sent_set]

        if not recipients:
            flash("All recipients in the selected audience have already been contacted.", "info")
            return redirect(url_for("send"))

        # Enrich recipients with buyer data
        buyers_map = {r.get("email", "").lower(): r for r in read_buyers()}
        enriched = []
        for r in recipients:
            email = r["email"]
            buyer_data = buyers_map.get(email, {})
            enriched.append({
                "email": email,
                "buyer_name": buyer_data.get("buyer_name", ""),
                "company_name": buyer_data.get("company_name", ""),
            })

        attachment_path = settings.get("presentation_path") if use_attachment else None

        try:
            report_data = send_campaign(
                subject=subject,
                body=body,
                recipients=enriched,
                attachment_path=attachment_path,
                gmail_email=gmail_email,
                gmail_password=gmail_password,
                cc_email=cc_email,
                send_delay=send_delay,
                daily_limit=daily_limit,
            )
            log_campaign_results(report_data, subject)
            _latest_report = report_data
            _latest_report["subject"] = subject

            flash(
                f"✓ Campaign complete! {report_data['success_count']} sent, "
                f"{report_data['failed_count']} failed.",
                "success",
            )
            return redirect(url_for("report"))
        except Exception as exc:
            flash(f"Campaign error: {exc}", "error")
            return redirect(url_for("send"))

    # GET
    default_subject = settings.get("default_subject", "")
    default_body = settings.get("default_body", "")
    biz_count = len(read_classified_emails("business"))
    ind_count = len(read_classified_emails("individual"))
    all_count = len(read_classified_emails("all"))

    return render_template(
        "send.html",
        stats=stats,
        attachment=attachment,
        default_subject=default_subject,
        default_body=default_body,
        biz_count=biz_count,
        ind_count=ind_count,
        all_count=all_count,
        settings=settings,
    )


@app.route("/report")
def report():
    """Report view route."""
    global _latest_report
    report_data = build_run_report(_latest_report if _latest_report else None)
    sent_log = read_sent_log()
    recent_log = list(reversed(sent_log[-20:])) if sent_log else []
    return render_template("report.html", report=report_data, recent_log=recent_log)


@app.route("/settings", methods=["GET", "POST"])
def settings():
    """Settings configuration route."""
    if request.method == "POST":
        data = {
            "email": request.form.get("email", "").strip(),
            "app_password": request.form.get("app_password", "").strip(),
            "cc_email": request.form.get("cc_email", "").strip(),
            "gemini_api_key": request.form.get("gemini_api_key", "").strip(),
            "default_subject": request.form.get("default_subject", "").strip(),
            "default_body": request.form.get("default_body", "").strip(),
            "send_delay": float(request.form.get("send_delay", 2)),
            "daily_send_limit": int(request.form.get("daily_send_limit", 100)),
            "presentation_path": request.form.get("presentation_path", "").strip(),
            "classification_preference": request.form.get("classification_preference", "both"),
        }

        if save_settings(data):
            flash("✓ Settings saved successfully!", "success")
        else:
            flash("Failed to save settings.", "error")

        return redirect(url_for("settings"))

    current = load_settings()
    attachment = get_attachment_info(current.get("presentation_path", ""))
    return render_template("settings.html", settings=current, attachment=attachment)


@app.route("/download-report")
def download_report():
    """Stream the campaign report as a downloadable CSV."""
    global _latest_report
    csv_content = generate_csv_report(_latest_report if _latest_report else None)
    buf = io.BytesIO(csv_content.encode("utf-8"))
    filename = f"export_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return send_file(
        buf,
        mimetype="text/csv",
        as_attachment=True,
        download_name=filename,
    )


@app.route("/search", methods=["POST"])
def run_search():
    """Trigger the buyer search pipeline in a background thread."""
    global _search_running, _search_log

    if _search_running:
        flash("A search is already running. Please wait.", "warning")
        return redirect(url_for("index"))

    keyword = request.form.get("keyword", "Singing Bowls").strip()

    def _run():
        global _search_running, _search_log
        _search_running = True
        _search_log = []

        from search import google_search, facebook_search, linkedin_search, directory_search, website_search
        from extraction.data_extractor import extract
        from validation.email_validator import validate_records

        adapters = [
            ("Google", google_search),
            ("Facebook", facebook_search),
            ("LinkedIn", linkedin_search),
            ("Directory", directory_search),
            ("Website", website_search),
        ]

        all_raw = []
        for name, adapter in adapters:
            try:
                records = adapter.search(keyword=keyword)
                all_raw.extend(records)
                _search_log.append(f"✓ {name}: {len(records)} records")
            except Exception as exc:
                _search_log.append(f"✗ {name}: {exc}")

        normalized = extract(all_raw)
        valid, invalid = validate_records(normalized)
        added = append_buyers(valid)
        _search_log.append(f"✓ Done: {added} new buyers added to database.")
        _search_running = False

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    flash(f"✓ Search started for '{keyword}'. This may take a few minutes.", "info")
    return redirect(url_for("index"))


@app.route("/search-status")
def search_status():
    """Return current search status as JSON."""
    from flask import jsonify
    return jsonify({"running": _search_running, "log": _search_log})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
