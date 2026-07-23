"""
gmail_auth.py — Gmail SMTP authentication handler.

Provides a context manager and factory function for obtaining
an authenticated SMTP connection using Gmail App Password credentials.
"""

import logging
import smtplib
import ssl
from contextlib import contextmanager
from typing import Generator

from config import SMTP_HOST, SMTP_PORT_SSL, SMTP_PORT_TLS

logger = logging.getLogger(__name__)


class GmailAuthError(Exception):
    """Raised when Gmail authentication fails."""


def create_smtp_connection(email: str, app_password: str) -> smtplib.SMTP_SSL:
    """
    Create and return an authenticated Gmail SMTP_SSL connection.

    Args:
        email: The Gmail address to authenticate with.
        app_password: The 16-character Gmail App Password.

    Returns:
        An authenticated smtplib.SMTP_SSL instance.

    Raises:
        GmailAuthError: If authentication fails.
    """
    if not email or not app_password:
        raise GmailAuthError("Gmail credentials are not configured. Please update Settings.")

    context = ssl.create_default_context()

    try:
        logger.info("Connecting to Gmail SMTP (%s:%d)…", SMTP_HOST, SMTP_PORT_SSL)
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT_SSL, context=context)
        server.login(email, app_password)
        logger.info("Gmail authentication successful for %s", email)
        return server
    except smtplib.SMTPAuthenticationError as exc:
        raise GmailAuthError(
            "Gmail authentication failed. Verify your email and App Password."
        ) from exc
    except smtplib.SMTPException as exc:
        raise GmailAuthError(f"SMTP error during login: {exc}") from exc
    except OSError as exc:
        raise GmailAuthError(f"Network error connecting to Gmail: {exc}") from exc


def reconnect(email: str, app_password: str) -> smtplib.SMTP_SSL:
    """
    Re-establish a dropped SMTP connection.
    Identical to create_smtp_connection — exists as a named alias for clarity
    in the sender module's retry logic.
    """
    logger.warning("SMTP session dropped — reconnecting…")
    return create_smtp_connection(email, app_password)


@contextmanager
def gmail_session(email: str, app_password: str) -> Generator[smtplib.SMTP_SSL, None, None]:
    """
    Context manager that provides an authenticated SMTP session
    and ensures it is closed on exit.

    Usage:
        with gmail_session(email, password) as smtp:
            smtp.send_message(msg)
    """
    server = create_smtp_connection(email, app_password)
    try:
        yield server
    finally:
        try:
            server.quit()
            logger.info("SMTP session closed cleanly.")
        except Exception:
            pass  # Already disconnected — safe to ignore
