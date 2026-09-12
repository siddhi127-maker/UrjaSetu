"""
Member 4 — Alert System
========================
Dispatches alerts via console logging (default) and optionally SMS via Twilio.
Supports alert types: blackout_risk, battery_low, diesel_activated,
maintenance_required, performance_degradation.
"""

import logging
from datetime import datetime
from typing import Optional, List

from sqlalchemy.orm import Session

from app.config import settings
from app.models.db_models import AlertLog

logger = logging.getLogger("urjasetu.alerts")


class AlertDispatcher:
    """Sends and logs alerts for critical microgrid events."""

    SEVERITY_LEVELS = {"info": 0, "warning": 1, "critical": 2}

    def __init__(self):
        self._twilio_client = None
        self._init_twilio()

    def _init_twilio(self):
        """Initialize Twilio client if credentials are available."""
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            try:
                from twilio.rest import Client
                self._twilio_client = Client(
                    settings.TWILIO_ACCOUNT_SID,
                    settings.TWILIO_AUTH_TOKEN,
                )
                logger.info("Twilio SMS alerts enabled")
            except ImportError:
                logger.warning("Twilio package not installed — SMS alerts disabled")
            except Exception as e:
                logger.warning(f"Twilio init failed: {e} — SMS alerts disabled")

    def send_alert(
        self,
        db: Session,
        alert_type: str,
        severity: str,
        message: str,
        send_sms: bool = False,
    ) -> AlertLog:
        """Create and dispatch an alert."""
        # Log to console
        log_method = {
            "info": logger.info,
            "warning": logger.warning,
            "critical": logger.critical,
        }.get(severity, logger.info)

        log_method(f"[{alert_type.upper()}] {message}")

        # Store in database
        alert = AlertLog(
            timestamp=datetime.now(),
            alert_type=alert_type,
            severity=severity,
            message=message,
            sent_sms=False,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        # Send SMS if requested and available
        if send_sms and self._twilio_client and severity in ("warning", "critical"):
            self._send_sms(alert)

        return alert

    def _send_sms(self, alert: AlertLog):
        """Send SMS via Twilio."""
        if not settings.TWILIO_FROM_NUMBER or not settings.TWILIO_TO_NUMBER:
            logger.warning("Twilio phone numbers not configured — skipping SMS")
            return

        try:
            sms_body = (
                f"⚡ UrjaSetu Alert ({alert.severity.upper()})\n\n"
                f"{alert.message}\n\n"
                f"Time: {alert.timestamp.strftime('%Y-%m-%d %H:%M')}"
            )
            self._twilio_client.messages.create(
                body=sms_body,
                from_=settings.TWILIO_FROM_NUMBER,
                to=settings.TWILIO_TO_NUMBER,
            )
            alert.sent_sms = True
            logger.info(f"SMS sent for alert #{alert.id}")
        except Exception as e:
            logger.error(f"SMS failed for alert #{alert.id}: {e}")

    def check_and_alert(
        self,
        db: Session,
        battery_soc: float,
        diesel_active: bool,
        shortfall: float,
        blackout_risk: Optional[str] = None,
        maintenance_needed: Optional[str] = None,
    ) -> List[AlertLog]:
        """Evaluate conditions and fire appropriate alerts."""
        alerts = []

        # Battery critically low
        if battery_soc <= 0.22:
            alerts.append(self.send_alert(
                db, "battery_low", "critical",
                f"Battery SoC has reached {battery_soc*100:.0f}%. "
                f"Reserve is critically low. Diesel backup required.",
                send_sms=True,
            ))
        elif battery_soc <= 0.30:
            alerts.append(self.send_alert(
                db, "battery_low", "warning",
                f"Battery SoC at {battery_soc*100:.0f}%. "
                f"Approaching minimum reserve threshold.",
            ))

        # Diesel activated
        if diesel_active:
            alerts.append(self.send_alert(
                db, "diesel_activated", "info",
                "Diesel generator has been activated to supplement renewable generation.",
            ))

        # Shortfall
        if shortfall > 0:
            alerts.append(self.send_alert(
                db, "blackout_risk", "critical",
                f"Power shortfall of {shortfall:.1f} kW detected. "
                f"Demand cannot be fully met by available sources.",
                send_sms=True,
            ))

        # Blackout risk (from predictor)
        if blackout_risk and blackout_risk in ("HIGH", "CRITICAL"):
            alerts.append(self.send_alert(
                db, "blackout_risk", "warning" if blackout_risk == "HIGH" else "critical",
                f"Blackout risk level: {blackout_risk}. "
                f"Renewable generation expected to remain low.",
                send_sms=(blackout_risk == "CRITICAL"),
            ))

        # Maintenance
        if maintenance_needed:
            alerts.append(self.send_alert(
                db, "maintenance_required", "warning",
                maintenance_needed,
            ))

        return alerts

    def get_recent_alerts(self, db: Session, limit: int = 50) -> List[AlertLog]:
        """Fetch recent alerts from database."""
        return (
            db.query(AlertLog)
            .order_by(AlertLog.timestamp.desc())
            .limit(limit)
            .all()
        )

    def get_unacknowledged_count(self, db: Session) -> int:
        """Count unacknowledged alerts."""
        return db.query(AlertLog).filter(AlertLog.acknowledged == False).count()

    def acknowledge_alert(self, db: Session, alert_id: int) -> bool:
        """Mark an alert as acknowledged."""
        alert = db.query(AlertLog).filter(AlertLog.id == alert_id).first()
        if alert:
            alert.acknowledged = True
            db.commit()
            return True
        return False


# Module-level singleton
alert_dispatcher = AlertDispatcher()
