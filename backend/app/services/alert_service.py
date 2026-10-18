"""
AQUORA AI - Outbound Alert & Emergency Notification Service
Supports legitimate real delivery channels:
1. Authenticated HTTP Webhooks (compatible with Discord, Slack, PagerDuty, and Generic Incident Webhooks).
2. Standard SMTP Email (compatible with SendGrid, AWS SES, Resend, and standard mail servers).
Features delivery-status tracking, safe test mode simulation, deduplication throttling, and persistent audit logging.
"""

import os
import time
import uuid
import json
import logging
import smtplib
import socket
import hashlib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.alert_delivery import AlertDeliveryModel
from app.schemas.alert import (
    AlertDispatchRequest,
    AlertTestRequest,
    AlertDispatchResponse,
    AlertDeliverySchema,
    AlertChannelStatusResponse,
)

logger = logging.getLogger(__name__)

DEFAULT_DEDUP_WINDOW_SECONDS = 60.0


class WebhookAlertProvider:
    """
    Dispatches real-time JSON alert payloads to downstream webhooks or incident gateways.
    Automatically adapts payload structure for Discord, Slack, and standard REST endpoints.
    """

    def __init__(self, default_url: Optional[str] = None, auth_token: Optional[str] = None, timeout: float = 6.0):
        self.default_url = default_url or settings.ALERT_WEBHOOK_URL
        self.auth_token = auth_token or settings.ALERT_WEBHOOK_AUTH_TOKEN
        self.timeout = timeout

    def send(self, req: AlertDispatchRequest, is_test_mode: bool) -> Tuple[str, bool, str, str]:
        """
        Returns: (status, confirmed_by_provider, provider_message, target_url)
        """
        target_url = (req.recipient or self.default_url or "").strip()

        if is_test_mode:
            resolved_target = target_url or "https://webhook-endpoint.test/aquora-alerts"
            return (
                "TEST_MODE_SIMULATED",
                False,
                f"Safe Test Mode: Payload validated for endpoint '{resolved_target}'. Delivery simulated without external transmission.",
                resolved_target,
            )

        if not target_url or target_url.startswith("your_"):
            return (
                "UNCONFIGURED",
                False,
                "No webhook destination configured. Provide ALERT_WEBHOOK_URL in environment or pass recipient URL.",
                target_url or "None",
            )

        is_test_prefix = "[TEST - SAFE MODE] " if req.test_mode else ""
        severity_upper = req.severity.upper()
        now_iso = datetime.now(timezone.utc).isoformat()

        # Format payload based on endpoint type
        if "discord.com/api/webhooks" in target_url:
            # Discord Webhook Embed format
            color_int = 0xF43F5E if severity_upper in ("HIGH", "EXTREME") else (0xFBBF24 if severity_upper == "MODERATE" else 0x10B981)
            payload = {
                "username": "AQUORA AI Safety Dispatcher",
                "content": f"{is_test_prefix}🚨 **AQUATIC HAZARD ADVISORY — {severity_upper}** at **{req.water_body_name}**",
                "embeds": [
                    {
                        "title": f"Advisory Notice: {req.water_body_name}",
                        "description": req.message,
                        "color": color_int,
                        "fields": [
                            {"name": "Severity", "value": severity_upper, "inline": True},
                            {"name": "Dispatched At", "value": now_iso, "inline": True},
                            {"name": "Mode", "value": "SYSTEM TEST" if req.test_mode else "LIVE ADVISORY", "inline": True},
                        ],
                        "footer": {"text": "AQUORA AI Hydrodynamic Early Warning System"},
                    }
                ],
            }
        elif "hooks.slack.com" in target_url:
            # Slack Incoming Webhook format
            payload = {
                "text": f"{is_test_prefix}🚨 *AQUORA ALERT [{severity_upper}]* — *{req.water_body_name}*\n{req.message}",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"{is_test_prefix}*AQUORA AI EMERGENCY ALERT: {severity_upper}*\n*Site:* {req.water_body_name}\n*Message:* {req.message}",
                        },
                    }
                ],
            }
        else:
            # Generic RFC-compliant incident management webhook payload
            payload = {
                "source": "AQUORA AI - Autonomous Water Safety Platform",
                "event": "SYSTEM_TEST" if req.test_mode else "AQUATIC_HAZARD_ALERT",
                "is_test_message": req.test_mode,
                "severity": severity_upper,
                "water_body_id": req.water_body_id,
                "water_body_name": req.water_body_name,
                "advisory_message": req.message,
                "dispatched_at": now_iso,
                "status": "DISPATCHED",
            }

        data = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "AQUORA-Alert-Dispatcher/1.0",
        }
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        try:
            http_req = urllib.request.Request(target_url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(http_req, timeout=self.timeout) as resp:
                status_code = resp.status
                if 200 <= status_code < 300:
                    body = resp.read().decode("utf-8", errors="ignore")[:200]
                    # Upstream confirmed receipt
                    status_label = "DELIVERED" if status_code in (200, 201) else "ACCEPTED"
                    return (
                        status_label,
                        True,
                        f"Upstream provider confirmed receipt (HTTP {status_code}): {body or 'OK'}",
                        target_url,
                    )
                else:
                    return (
                        "FAILED",
                        False,
                        f"Upstream webhook returned non-success HTTP status: {status_code}",
                        target_url,
                    )
        except urllib.error.HTTPError as exc:
            return (
                "FAILED",
                False,
                f"Upstream webhook rejected dispatch: HTTP {exc.code} {exc.reason}",
                target_url,
            )
        except (urllib.error.URLError, socket.timeout, Exception) as exc:
            logger.warning("Webhook dispatch failed to %s: %s", target_url, exc)
            return (
                "FAILED",
                False,
                f"Webhook transmission error: {type(exc).__name__} ({str(exc)})",
                target_url,
            )


class EmailAlertProvider:
    """
    Dispatches emergency water safety notices via standard SMTP email service.
    Supports TLS, STARTTLS, and authenticated relay.
    """

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        from_email: Optional[str] = None,
        default_to: Optional[str] = None,
        timeout: float = 6.0,
    ):
        self.host = host or settings.SMTP_HOST
        self.port = port or settings.SMTP_PORT
        self.username = username or settings.SMTP_USERNAME
        self.password = password or settings.SMTP_PASSWORD
        self.from_email = from_email or settings.ALERT_FROM_EMAIL
        self.default_to = default_to or settings.ALERT_TO_EMAIL
        self.timeout = timeout

    def send(self, req: AlertDispatchRequest, is_test_mode: bool) -> Tuple[str, bool, str, str]:
        """
        Returns: (status, confirmed_by_provider, provider_message, target_email)
        """
        target_email = (req.recipient or self.default_to or "").strip()

        if is_test_mode:
            resolved_email = target_email or "authority-duty-officer@safety.gov"
            return (
                "TEST_MODE_SIMULATED",
                False,
                f"Safe Test Mode: Email message formatted and validated for '{resolved_email}'. Delivery simulated without connecting to SMTP server.",
                resolved_email,
            )

        if not self.host or self.host.startswith("smtp.example"):
            return (
                "UNCONFIGURED",
                False,
                "No SMTP_HOST configured in backend environment. Configure SMTP credentials or use safe test mode.",
                target_email or "None",
            )

        if not target_email:
            return (
                "UNCONFIGURED",
                False,
                "No recipient email specified. Set ALERT_TO_EMAIL in environment or pass recipient email in request.",
                "None",
            )

        # Build MIME email message
        msg = MIMEMultipart()
        msg["From"] = self.from_email
        msg["To"] = target_email

        if req.test_mode:
            msg["Subject"] = f"[AQUORA SYSTEM TEST - {req.severity.upper()}] Hydrodynamic Risk Simulation at {req.water_body_name}"
            header_banner = "AQUORA AI SYSTEM TEST NOTIFICATION (SAFE TEST - NO ACTION REQUIRED)"
        else:
            msg["Subject"] = f"[AQUORA EMERGENCY ALERT - {req.severity.upper()}] Hydrodynamic Risk at {req.water_body_name}"
            header_banner = "AQUORA AI EMERGENCY WATER SAFETY DISPATCH"

        body = (
            f"{header_banner}\n"
            f"-----------------------------------------\n"
            f"Site: {req.water_body_name}\n"
            f"Severity: {req.severity.upper()}\n"
            f"Dispatched At: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n"
            f"Advisory Message:\n{req.message}\n\n"
            f"-----------------------------------------\n"
            f"Automated notification issued by AQUORA AI platform.\n"
        )
        msg.attach(MIMEText(body, "plain"))

        try:
            server = smtplib.SMTP(self.host, self.port, timeout=self.timeout)
            try:
                server.ehlo()
                if server.has_extn("STARTTLS"):
                    server.starttls()
                    server.ehlo()
                if self.username and self.password:
                    server.login(self.username, self.password)
                send_errs = server.send_message(msg)
                if not send_errs:
                    return (
                        "DELIVERED",
                        True,
                        f"SMTP server ({self.host}:{self.port}) confirmed receipt and accepted message for {target_email}",
                        target_email,
                    )
                else:
                    return (
                        "FAILED",
                        False,
                        f"SMTP server rejected recipients: {send_errs}",
                        target_email,
                    )
            finally:
                try:
                    server.quit()
                except Exception:
                    pass
        except (smtplib.SMTPException, socket.error, Exception) as exc:
            logger.warning("SMTP dispatch failed: %s", exc)
            return (
                "FAILED",
                False,
                f"SMTP transmission error: {type(exc).__name__} ({str(exc)})",
                target_email,
            )


class AlertService:
    """
    Orchestrates outbound alert delivery with delivery status tracking,
    duplicate suppression, safe test modes, and persistent audit logging.
    """

    def __init__(self, dedup_window_seconds: float = DEFAULT_DEDUP_WINDOW_SECONDS):
        self.webhook_provider = WebhookAlertProvider()
        self.email_provider = EmailAlertProvider()
        self.dedup_window_seconds = dedup_window_seconds
        # In-memory deduplication cache: { dedup_hash: last_dispatched_timestamp }
        self._dedup_cache: Dict[str, float] = {}

    def _compute_dedup_key(self, req: AlertDispatchRequest) -> str:
        raw = f"{req.water_body_name}|{req.severity}|{req.message}|{req.channel}|{req.recipient or ''}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get_channel_status(self) -> AlertChannelStatusResponse:
        webhook_ok = bool(settings.ALERT_WEBHOOK_URL and not settings.ALERT_WEBHOOK_URL.startswith("your_"))
        email_ok = bool(settings.SMTP_HOST and not settings.SMTP_HOST.startswith("smtp.example"))
        return AlertChannelStatusResponse(
            webhook_configured=webhook_ok,
            email_configured=email_ok,
            default_webhook_url=settings.ALERT_WEBHOOK_URL if webhook_ok else None,
            default_email_recipient=settings.ALERT_TO_EMAIL if email_ok else None,
            test_mode_enforced=settings.ALERT_TEST_MODE,
            dedup_window_seconds=self.dedup_window_seconds,
            notice=(
                "Safe test mode active in backend environment. Dispatches will be simulated without external transmission."
                if settings.ALERT_TEST_MODE
                else "Live dispatch channels active where credentials are provided."
            ),
        )

    def dispatch_alert(self, req: AlertDispatchRequest, db: Session) -> AlertDispatchResponse:
        delivery_id = str(uuid.uuid4())
        is_test = req.test_mode or settings.ALERT_TEST_MODE
        channel_clean = (req.channel or "webhook").strip().lower()

        # Check duplicate suppression if not in test mode and not forced
        if not is_test and not req.force:
            dedup_key = self._compute_dedup_key(req)
            now = time.time()
            if dedup_key in self._dedup_cache:
                elapsed = now - self._dedup_cache[dedup_key]
                if elapsed < self.dedup_window_seconds:
                    logger.info("Suppressed duplicate alert dispatch for %s (elapsed: %.1fs)", req.water_body_name, elapsed)
                    return AlertDispatchResponse(
                        delivery_id=delivery_id,
                        channel=channel_clean,
                        recipient=req.recipient or "Configured default",
                        severity=req.severity,
                        status="DUPLICATE_SUPPRESSED",
                        confirmed_by_provider=False,
                        provider_message=f"Duplicate alert suppressed within {int(self.dedup_window_seconds)}s throttling window (last sent {int(elapsed)}s ago). Use force=true to override.",
                        dispatched_at=datetime.now(timezone.utc),
                        test_mode=False,
                        notice="Duplicate prevention active. Message was not re-sent.",
                    )

        if channel_clean == "email":
            status, confirmed, prov_msg, recipient = self.email_provider.send(req, is_test)
        else:
            channel_clean = "webhook"
            status, confirmed, prov_msg, recipient = self.webhook_provider.send(req, is_test)

        # Update deduplication cache on successful/attempted real dispatch
        if not is_test and status in ("DELIVERED", "ACCEPTED"):
            self._dedup_cache[self._compute_dedup_key(req)] = time.time()

        # Context notice
        if status in ("DELIVERED", "ACCEPTED"):
            notice = "Outbound transmission confirmed by upstream delivery provider."
        elif status == "TEST_MODE_SIMULATED":
            notice = "Safe test mode: payload verified; delivery simulated without contacting external network."
        elif status == "UNCONFIGURED":
            notice = "Delivery provider unconfigured. Set credentials in environment to activate external delivery."
        else:
            notice = "Outbound delivery failed during transmission to upstream provider."

        # Persist audit record to SQLite database
        delivery_record = AlertDeliveryModel(
            id=delivery_id,
            alert_id=None,
            water_body_id=req.water_body_id,
            water_body_name=req.water_body_name,
            severity=req.severity,
            channel=channel_clean,
            recipient=recipient,
            message=req.message,
            status=status,
            confirmed_by_provider=confirmed,
            provider_message=prov_msg,
            is_test_mode=is_test,
            created_at=datetime.now(timezone.utc),
        )
        db.add(delivery_record)
        db.commit()

        return AlertDispatchResponse(
            delivery_id=delivery_id,
            channel=channel_clean,
            recipient=recipient,
            severity=req.severity,
            status=status,
            confirmed_by_provider=confirmed,
            provider_message=prov_msg,
            dispatched_at=delivery_record.created_at,
            test_mode=is_test,
            notice=notice,
        )

    def dispatch_test_notification(self, test_req: AlertTestRequest, db: Session) -> AlertDispatchResponse:
        """Dispatches an explicitly authorized test notification."""
        test_message = (
            f"TEST ADVISORY: This is an authorized test notification from AQUORA AI. "
            f"Testing outbound {test_req.channel.upper()} delivery pipeline for {test_req.water_body_name}. "
            f"No emergency response required."
        )
        dispatch_req = AlertDispatchRequest(
            water_body_name=test_req.water_body_name,
            severity="low",
            message=test_message,
            channel=test_req.channel,
            recipient=test_req.recipient,
            test_mode=test_req.safe_simulation_only,
            force=True,
        )
        return self.dispatch_alert(dispatch_req, db)

    def get_recent_deliveries(self, db: Session, limit: int = 20) -> List[AlertDeliveryModel]:
        return db.query(AlertDeliveryModel).order_by(AlertDeliveryModel.created_at.desc()).limit(limit).all()


alert_service = AlertService()
