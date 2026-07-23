"""
attachment_handler.py — Presentation file attachment logic.

Loads the company presentation from the configured path and
attaches it to an outbound EmailMessage object.
"""

import logging
import mimetypes
import os
from email.message import EmailMessage
from pathlib import Path

from config import PRESENTATION_PATH, ALLOWED_ATTACHMENT_EXTENSIONS

logger = logging.getLogger(__name__)


class AttachmentError(Exception):
    """Raised when the attachment file is missing or has an unsupported format."""


def validate_attachment(path: str) -> Path:
    """
    Validate that the attachment file exists and has an allowed extension.

    Args:
        path: Filesystem path to the attachment file.

    Returns:
        Resolved Path object.

    Raises:
        AttachmentError: If the file is missing or has an invalid extension.
    """
    p = Path(path).resolve()

    if not p.exists():
        raise AttachmentError(
            f"Presentation file not found: {p}\n"
            "Place your PDF/PPTX in the 'assets/' directory and update PRESENTATION_PATH."
        )

    if p.suffix.lower() not in ALLOWED_ATTACHMENT_EXTENSIONS:
        raise AttachmentError(
            f"Unsupported attachment format '{p.suffix}'. "
            f"Allowed: {', '.join(ALLOWED_ATTACHMENT_EXTENSIONS)}"
        )

    return p


def attach_presentation(msg: EmailMessage, path: str = PRESENTATION_PATH) -> bool:
    """
    Attach the company presentation file to an EmailMessage.

    Args:
        msg: The EmailMessage to attach the file to.
        path: Path to the attachment file (defaults to PRESENTATION_PATH).

    Returns:
        True if attachment succeeded, False if the file is missing
        (non-fatal — email is sent without attachment and a warning is logged).
    """
    if not path:
        logger.warning("No attachment path configured — sending without attachment.")
        return False

    try:
        p = validate_attachment(path)
        mime_type, _ = mimetypes.guess_type(str(p))
        main_type, sub_type = (mime_type or "application/octet-stream").split("/", 1)

        with open(p, "rb") as fh:
            msg.add_attachment(
                fh.read(),
                maintype=main_type,
                subtype=sub_type,
                filename=p.name,
            )

        logger.debug("Attached '%s' (%d bytes)", p.name, p.stat().st_size)
        return True

    except AttachmentError as exc:
        logger.warning("Attachment skipped: %s", exc)
        return False
    except OSError as exc:
        logger.warning("Could not read attachment '%s': %s", path, exc)
        return False


def get_attachment_info(path: str = PRESENTATION_PATH) -> dict:
    """
    Return metadata about the configured attachment.

    Returns:
        Dict with keys: exists, name, size_kb, extension.
    """
    p = Path(path).resolve() if path else Path()
    if p.exists():
        return {
            "exists": True,
            "name": p.name,
            "size_kb": round(p.stat().st_size / 1024, 1),
            "extension": p.suffix.lower(),
        }
    return {
        "exists": False,
        "name": path or "Not configured",
        "size_kb": 0,
        "extension": "",
    }
