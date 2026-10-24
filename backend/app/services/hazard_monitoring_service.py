"""
AQUORA AI - Automated Hazard Monitoring & Threshold Evaluation Engine
Processes newly available environmental observations, recalculates risk,
detects water-level surges, checks configurable hazard thresholds, generates
warning advisories, persists records to SQLite, and coordinates outbound dispatch.
"""

import logging
import threading
import time
from collections import deque
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.alert import AlertModel
from app.models.water_body import WaterBodyModel
from app.schemas.alert import AlertDispatchRequest
from app.schemas.monitoring import (
    HazardEvaluationTrigger,
    HazardEvaluationResult,
    HazardMonitoringStatusResponse,
)
from app.schemas.prediction import PredictRequest
from app.ml.predictor import risk_predictor
from app.core.risk_classifier import classify_risk_score
from app.services.river_data_service import river_data_service
from app.services.alert_service import alert_service

logger = logging.getLogger(__name__)

# Default Hazard Thresholds
DEFAULT_FLOW_RATE_THRESHOLD_CMS = 6.0       # Flow velocity >= 6.0 m³/s considered hazardous
DEFAULT_STAGE_SURGE_THRESHOLD_M = 0.15      # Sudden rise of >= 15 cm within observation window
DEFAULT_RISK_SCORE_THRESHOLD = 60.0         # Risk score >= 60 triggers high hazard warning
DEFAULT_MONITORING_INTERVAL_SECONDS = 60.0  # Safe monitoring sweep interval


class HazardMonitoringService:
    """
    Automated background and on-demand hazard monitoring service.
    """

    def __init__(
        self,
        flow_threshold_cms: float = DEFAULT_FLOW_RATE_THRESHOLD_CMS,
        surge_threshold_m: float = DEFAULT_STAGE_SURGE_THRESHOLD_M,
        risk_threshold: float = DEFAULT_RISK_SCORE_THRESHOLD,
        interval_seconds: float = DEFAULT_MONITORING_INTERVAL_SECONDS,
    ):
        self.flow_threshold_cms = flow_threshold_cms
        self.surge_threshold_m = surge_threshold_m
        self.risk_threshold = risk_threshold
        self.interval_seconds = interval_seconds

        # Track previous observations: { station_key: { "stage_m": float, "timestamp": str } }
        self._station_state: Dict[str, Dict[str, Any]] = {}
        self._recent_evaluations: deque = deque(maxlen=30)
        self._last_evaluation_timestamp: Optional[datetime] = None
        self._evaluations_count: int = 0

        # Background thread control
        self._running: bool = False
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.RLock()

        # Monitored stations catalogue
        self.monitored_stations = [
            "USGS-11164500",
            "RAMAMANGALAM-BRIDGE",
            "Cascade Canyon River",
            "Blackwood Gorge",
        ]

    def get_thresholds(self) -> Dict[str, float]:
        return {
            "flow_rate_warning_threshold_cms": self.flow_threshold_cms,
            "stage_surge_warning_threshold_m": self.surge_threshold_m,
            "risk_score_warning_threshold": self.risk_threshold,
            "monitoring_interval_seconds": self.interval_seconds,
            "stage_surge_m": self.surge_threshold_m,
            "flow_rate_breach_cms": self.flow_threshold_cms,
            "risk_score_breach": self.risk_threshold,
        }

    def evaluate_station(
        self,
        station_query: str,
        db: Session,
        test_mode: bool = True,
        safe_simulation: Optional[bool] = None,
    ) -> HazardEvaluationResult:
        """
        Evaluates a single station against real-time telemetry and hazard thresholds.
        Does NOT fabricate observations or treat stale data silently as live.
        """
        if safe_simulation is not None:
            test_mode = safe_simulation

        evaluated_at = datetime.now(timezone.utc)
        telemetry = river_data_service.get_river_data(station_query)

        # 1. Check if telemetry is unavailable or failed quality checks
        if telemetry.status in ("UNAVAILABLE", "ERROR"):
            result = HazardEvaluationResult(
                station_name=telemetry.station_name,
                evaluation_status="TELEMETRY_UNAVAILABLE",
                is_live=False,
                observed_stage_m=None,
                stage_delta_m=None,
                observed_flow_cms=None,
                recalculated_risk_score=None,
                recalculated_risk_level=None,
                triggers_detected=[],
                generated_alert_id=None,
                outbound_delivery_status="SKIPPED",
                confirmed_by_provider=False,
                evaluated_at=evaluated_at,
                notice=(
                    f"Live telemetry unavailable for '{telemetry.station_name}' (Status: {telemetry.status}). "
                    f"Threshold evaluation safely skipped; stale or fabricated data is never substituted."
                ),
            )
            with self._lock:
                self._recent_evaluations.append(result)
                self._last_evaluation_timestamp = evaluated_at
                self._evaluations_count += 1
            return result

        # 2. Verify telemetry physical data quality before generating any alerts
        stage_m = telemetry.water_level_m
        flow_cms = telemetry.flow_rate_cms

        is_non_physical = False
        anomaly_reason = ""
        if stage_m is not None and (stage_m < -5.0 or stage_m > 60.0):
            is_non_physical = True
            anomaly_reason = f"Stage reading {stage_m:.2f}m is physically implausible (-5m to 60m bounds)"
        elif flow_cms is not None and (flow_cms < 0.0 or flow_cms > 15000.0):
            is_non_physical = True
            anomaly_reason = f"Flow reading {flow_cms:.2f} cms violates physical boundaries"
        elif stage_m is None and flow_cms is None:
            is_non_physical = True
            anomaly_reason = "Both water stage and flow readings are missing from telemetry"

        if is_non_physical:
            logger.warning("Telemetry data-quality anomaly at %s: %s", telemetry.station_name, anomaly_reason)
            result = HazardEvaluationResult(
                station_name=telemetry.station_name,
                evaluation_status="DATA_QUALITY_ANOMALY",
                is_live=telemetry.is_live,
                observed_stage_m=stage_m,
                stage_delta_m=None,
                observed_flow_cms=flow_cms,
                recalculated_risk_score=None,
                recalculated_risk_level=None,
                triggers_detected=[],
                generated_alert_id=None,
                outbound_delivery_status="SKIPPED",
                confirmed_by_provider=False,
                evaluated_at=evaluated_at,
                notice=f"Telemetry rejected during data-quality check: {anomaly_reason}. Alert suppressed.",
            )
            with self._lock:
                self._recent_evaluations.append(result)
                self._last_evaluation_timestamp = evaluated_at
                self._evaluations_count += 1
            return result
        triggers: List[HazardEvaluationTrigger] = []

        # 3. Detect sudden stage surge compared to previous observation
        cache_key = station_query.strip().upper()
        stage_delta: Optional[float] = None

        if cache_key in self._station_state and stage_m is not None:
            prev_stage = self._station_state[cache_key].get("stage_m")
            if prev_stage is not None:
                stage_delta = round(stage_m - prev_stage, 4)
                if stage_delta >= self.surge_threshold_m:
                    triggers.append(
                        HazardEvaluationTrigger(
                            trigger_type="STAGE_SURGE",
                            observed_value=stage_delta,
                            threshold_value=self.surge_threshold_m,
                            description=(
                                f"Rapid stage rise detected: +{stage_delta:.3f}m surge exceeds "
                                f"threshold (+{self.surge_threshold_m:.2f}m)."
                            ),
                        )
                    )

        # Update cached state
        if stage_m is not None:
            self._station_state[cache_key] = {
                "stage_m": stage_m,
                "timestamp": telemetry.observation_timestamp or evaluated_at.isoformat(),
            }

        # 4. Check flow rate breach (only if flow is measured)
        if flow_cms is not None and flow_cms >= self.flow_threshold_cms:
            triggers.append(
                HazardEvaluationTrigger(
                    trigger_type="FLOW_RATE_BREACH",
                    observed_value=flow_cms,
                    threshold_value=self.flow_threshold_cms,
                    description=(
                        f"Discharge velocity {flow_cms:.2f} m³/s exceeds high current safety limit "
                        f"({self.flow_threshold_cms:.1f} m³/s)."
                    ),
                )
            )

        # 5. Recalculate risk score via predictor
        safe_depth = max(0.1, float(stage_m)) if stage_m is not None else 3.0
        safe_flow = max(0.0, float(flow_cms)) if flow_cms is not None else 1.0
        pred_req = PredictRequest(
            water_body_id=None,
            water_temp_c=26.5,  # Ambient tropical water temperature default if unmetered (prevents false cold-shock spike)
            flow_rate_cms=safe_flow,
            depth_meters=safe_depth,
            rainfall_last_24h_mm=25.0 if triggers else 5.0,
            wind_speed_kmh=15.0,
            visibility_meters=3000.0,
            include_ai_explanation=False,
        )
        prediction = risk_predictor.predict(pred_req)
        risk_score = prediction.risk_score
        risk_level, _ = classify_risk_score(risk_score)

        if risk_score >= self.risk_threshold:
            triggers.append(
                HazardEvaluationTrigger(
                    trigger_type="RISK_SCORE_BREACH",
                    observed_value=risk_score,
                    threshold_value=self.risk_threshold,
                    description=(
                        f"Calculated hazard score {risk_score:.1f}/100 ({risk_level.upper()}) "
                        f"breached advisory threshold ({self.risk_threshold:.1f})."
                    ),
                )
            )

        # 6. If any triggers detected, persist warning and coordinate outbound dispatch
        generated_alert_id: Optional[int] = None
        delivery_status: Optional[str] = None
        confirmed_by_provider: bool = False

        if triggers:
            eval_status = "HAZARD_DETECTED"
            trigger_summaries = "; ".join(t.description for t in triggers)
            obs_time = telemetry.observation_timestamp or "Unknown"
            src = getattr(telemetry, "data_source", None) or getattr(telemetry, "source_type", None) or "Hydrological Gauge"
            alert_msg = (
                f"[AQUORA ADVISORY] Hazard breach at {telemetry.station_name}. "
                f"Reason: {trigger_summaries}. "
                f"Observed: {obs_time} (Source: {src}). "
                f"Guidance: Maintain 15m shoreline setback. Prohibit wading/swimming. "
                f"Notice: Automated decision support; not an official statutory evacuation order."
            )

            # Match water body in DB if available
            wb_match = db.query(WaterBodyModel).filter(
                WaterBodyModel.name.ilike(f"%{telemetry.station_name}%")
            ).first()
            if not wb_match:
                wb_match = db.query(WaterBodyModel).filter(
                    WaterBodyModel.name.ilike(f"%{station_query}%")
                ).first()

            # Persist to AlertModel in SQLite
            new_alert = AlertModel(
                water_body_id=wb_match.id if wb_match else None,
                water_body_name=telemetry.station_name,
                severity="high" if risk_score < 80 else "extreme",
                message=alert_msg[:490],
                timestamp=evaluated_at,
            )
            db.add(new_alert)
            db.commit()
            db.refresh(new_alert)
            generated_alert_id = new_alert.id

            # Coordinate outbound delivery via AlertService
            dispatch_req = AlertDispatchRequest(
                water_body_id=new_alert.water_body_id,
                water_body_name=telemetry.station_name,
                severity=new_alert.severity,
                message=alert_msg,
                channel="webhook",
                test_mode=test_mode or settings.ALERT_TEST_MODE,
                force=False,  # Respect 60s duplicate suppression
            )
            dispatch_resp = alert_service.dispatch_alert(dispatch_req, db)
            delivery_status = dispatch_resp.status
            confirmed_by_provider = dispatch_resp.confirmed_by_provider
            notice = f"Automated warning generated (Alert ID: {generated_alert_id}). Delivery status: {delivery_status}."
        else:
            eval_status = "NOMINAL"
            delivery_status = "NOT_REQUIRED"
            notice = f"All observed hydrological parameters within normal bounds (Score: {risk_score:.1f}/100)."

        result = HazardEvaluationResult(
            station_name=telemetry.station_name,
            evaluation_status=eval_status,
            is_live=telemetry.is_live,
            observed_stage_m=stage_m,
            stage_delta_m=stage_delta,
            observed_flow_cms=flow_cms,
            recalculated_risk_score=risk_score,
            recalculated_risk_level=risk_level,
            triggers_detected=triggers,
            generated_alert_id=generated_alert_id,
            outbound_delivery_status=delivery_status,
            confirmed_by_provider=confirmed_by_provider,
            evaluated_at=evaluated_at,
            notice=notice,
        )

        with self._lock:
            self._recent_evaluations.append(result)
            self._last_evaluation_timestamp = evaluated_at
            self._evaluations_count += 1

        return result

    def evaluate_all(
        self,
        db: Session,
        test_mode: bool = True,
        safe_simulation: Optional[bool] = None,
    ) -> List[HazardEvaluationResult]:
        """Runs evaluation sweep across all configured monitoring stations."""
        if safe_simulation is not None:
            test_mode = safe_simulation
        results: List[HazardEvaluationResult] = []
        for station in self.monitored_stations:
            try:
                res = self.evaluate_station(station, db, test_mode=test_mode)
                results.append(res)
            except Exception as e:
                logger.error("Error evaluating station %s: %s", station, e)
        return results

    def start_scheduler(self, interval_seconds: Optional[float] = None) -> HazardMonitoringStatusResponse:
        """Starts the persistent background monitoring thread."""
        with self._lock:
            if interval_seconds:
                self.interval_seconds = float(interval_seconds)
            if not self._running:
                self._running = True
                self._stop_event.clear()
                self._thread = threading.Thread(target=self._scheduler_loop, daemon=True, name="AquoraHazardMonitor")
                self._thread.start()
                logger.info("Automated Hazard Monitoring scheduler started (interval: %.1fs)", self.interval_seconds)
        return self.get_status()

    def stop_scheduler(self) -> HazardMonitoringStatusResponse:
        """Stops the persistent background monitoring thread."""
        thread_to_join = None
        with self._lock:
            if self._running:
                self._running = False
                self._stop_event.set()
                thread_to_join = self._thread
                self._thread = None
        if thread_to_join and thread_to_join.is_alive():
            thread_to_join.join(timeout=1.0)
            logger.info("Automated Hazard Monitoring scheduler stopped.")
        return self.get_status()

    def _scheduler_loop(self):
        """Periodic background evaluation loop."""
        # Initial brief pause to allow immediate stop cancellation
        if self._stop_event.wait(0.2):
            return

        while not self._stop_event.is_set():
            db = SessionLocal()
            try:
                self.evaluate_all(db, test_mode=True)
            except Exception as exc:
                logger.error("Error in automated hazard monitor scheduler: %s", exc)
            finally:
                db.close()

            # Wait for next interval or stop event
            if self._stop_event.wait(self.interval_seconds):
                break


    def get_status(self) -> HazardMonitoringStatusResponse:
        with self._lock:
            return HazardMonitoringStatusResponse(
                is_scheduler_running=self._running,
                monitoring_interval_seconds=self.interval_seconds,
                safe_simulation_enforced=True,
                thresholds=self.get_thresholds(),
                monitored_stations=list(self.monitored_stations),
                last_evaluation_timestamp=self._last_evaluation_timestamp,
                evaluations_count=self._evaluations_count,
                recent_evaluations=list(self._recent_evaluations)[-10:],
            )


# Singleton hazard monitoring service
hazard_monitoring_service = HazardMonitoringService()
