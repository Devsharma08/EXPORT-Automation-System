"""settings_helper.py — Read/write the settings.json singleton."""

import json
import logging
import os

from config import SETTINGS_JSON

logger = logging.getLogger(__name__)

DEFAULTS = {
    "email": "",
    "app_password": "",
    "cc_email": "",
    "gemini_api_key": "",
    "default_subject": "Singing Bowls — Product Catalogue & Export Partnership",
    "default_body": (
        "Dear {name},\n\nI hope this message finds you well.\n\n"
        "We are a leading exporter of authentic Singing Bowls from Nepal.\n\n"
        "Please find our product catalogue attached.\n\n"
        "We would love to discuss a partnership opportunity.\n\n"
        "Warm regards,\nThe Export Team"
    ),
    "send_delay": 2,
    "daily_send_limit": 100,
    "classification_preference": "both",
    "presentation_path": "assets/company_presentation.pdf",
}


def load_settings() -> dict:
    """Load settings from settings.json, falling back to defaults."""
    if os.path.exists(SETTINGS_JSON):
        try:
            with open(SETTINGS_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
            return {**DEFAULTS, **data}
        except Exception as exc:
            logger.warning("Could not read settings.json: %s", exc)
    return dict(DEFAULTS)


def save_settings(data: dict) -> bool:
    """Save settings dict to settings.json."""
    try:
        os.makedirs(os.path.dirname(SETTINGS_JSON), exist_ok=True)
        with open(SETTINGS_JSON, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as exc:
        logger.error("Could not save settings: %s", exc)
        return False
