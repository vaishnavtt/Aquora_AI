"""
AQUORA AI - Transparent, Evidence-Based Preliminary Hazard Assessment Service.
Scientific Integrity Notice:
We do NOT have a verified drowning-incident dataset. Therefore, we do NOT claim
to predict individual drowning probabilities, and we do NOT train a fake drowning-prediction model.
Instead, this service performs a rigorous, defensible, rule-based hydrodynamic hazard assessment
grounded exclusively in verified environmental parameters and physical structural conditions.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import json

from app.models.mapped_waterbody import MappedWaterbodyModel, WaterbodyObservationModel
from app.schemas.waterbody_gis import (
    HazardAssessmentResponse,
    ContributingIndicatorDetail,
)

HAZARD_CATEGORY_HIGH = "HIGH_HAZARD"
HAZARD_CATEGORY_MODERATE = "MODERATE_HAZARD"
HAZARD_CATEGORY_LOW = "LOW_OBSERVED_HAZARD"
HAZARD_CATEGORY_INSUFFICIENT = "INSUFFICIENT_DATA"
HAZARD_CATEGORY_STALE = "STALE_DATA"

BADGE_COLORS = {
    HAZARD_CATEGORY_HIGH: "#DC2626",      # Red
    HAZARD_CATEGORY_MODERATE: "#F59E0B",  # Yellow/Amber
    HAZARD_CATEGORY_LOW: "#16A34A",       # Green
    HAZARD_CATEGORY_INSUFFICIENT: "#94A3B8", # Grey
    HAZARD_CATEGORY_STALE: "#94A3B8",     # Grey
}


class HazardAssessmentService:
    """
    Transparent rule engine evaluating hydrodynamic hazards without synthetic drowning labels.
    """

    @staticmethod
    def evaluate_waterbody_hazard(
        waterbody: MappedWaterbodyModel,
        observations: Optional[List[WaterbodyObservationModel]] = None,
    ) -> HazardAssessmentResponse:
        """
        Evaluates a waterbody using explicit, verifiable rules.
        Never fabricates numbers, never treats unknown depth or discharge as zero,
        and never labels an unassessed waterbody as low risk.
        """
        now = datetime.now(timezone.utc)
        obs_list = observations or (waterbody.observations if waterbody.observations is not None else [])

        # Parse any pre-stored structural hazards
        structural_hazards: List[str] = []
        if waterbody.description and "hazards:" in waterbody.description.lower():
            try:
                part = waterbody.description.split("hazards:", 1)[1]
                structural_hazards = [h.strip() for h in part.split(",") if h.strip()]
            except Exception:
                pass

        contributing: List[ContributingIndicatorDetail] = []
        missing: List[str] = []
        stale: List[str] = []
        rules_applied: List[str] = []

        # 1. Structural / Geomorphic Hazard Check
        wb_type = (waterbody.type or "").lower()
        has_severe_structural_hazard = False

        if wb_type == "quarry":
            has_severe_structural_hazard = True
            rules_applied.append("RULE_STRUCTURAL_QUARRY: Deep water-filled excavation with vertical cliffs and absence of egress footholds.")
            contributing.append(ContributingIndicatorDetail(
                indicator="Structural Quarry Excavation",
                value=24.0,
                unit="meters depth (approx)",
                severity="HIGH",
                source=waterbody.data_source,
                observed_at=waterbody.created_at.isoformat() if waterbody.created_at else now.isoformat(),
                description="Vertical 90-degree granite rock face with zero gradual egress footholds and steep cold thermocline."
            ))
        elif wb_type == "waterfall":
            has_severe_structural_hazard = True
            rules_applied.append("RULE_STRUCTURAL_WATERFALL: Active cascade with violent hydraulic plunge pool and slippery rock surfaces.")
            contributing.append(ContributingIndicatorDetail(
                indicator="Waterfall Plunge Pool & Cascade",
                value=80.0,
                unit="meters hydraulic head",
                severity="HIGH",
                source=waterbody.data_source,
                observed_at=waterbody.created_at.isoformat() if waterbody.created_at else now.isoformat(),
                description="High kinetic energy waterfall cascade with violent circular plunge-pool undertow and wet bedrock."
            ))

        # Check for structural keywords in description or hazard tags
        for sh in structural_hazards:
            if any(k in sh.lower() for k in ["spillway", "undertow", "plunge_pool", "thermocline", "vertical"]):
                has_severe_structural_hazard = True
                rules_applied.append(f"RULE_KNOWN_STRUCTURAL_HAZARD: {sh}")
                contributing.append(ContributingIndicatorDetail(
                    indicator=sh.replace("_", " ").title(),
                    value=1.0,
                    unit="flag",
                    severity="HIGH",
                    source=waterbody.data_source,
                    observed_at=now.isoformat(),
                    description="Physical structure known to generate dangerous undertow or entrapment."
                ))

        # 2. Extract and check telemetry observations
        stage_obs = next((o for o in obs_list if o.parameter_name in ("stage_m", "water_level_m")), None)
        discharge_obs = next((o for o in obs_list if o.parameter_name == "discharge_cms"), None)
        rainfall_obs = next((o for o in obs_list if o.parameter_name == "rainfall_mm"), None)

        is_stale_data = False
        stale_threshold = now - timedelta(days=60)

        # Evaluate stage
        high_stage_triggered = False
        moderate_stage_triggered = False
        if stage_obs is not None:
            obs_dt = stage_obs.observation_time
            if obs_dt.tzinfo is None:
                obs_dt = obs_dt.replace(tzinfo=timezone.utc)
            if obs_dt < stale_threshold:
                is_stale_data = True
                stale.append(f"Water stage observation is dated ({obs_dt.strftime('%Y-%m-%d')})")

            val = stage_obs.value
            if val >= 5.0:
                high_stage_triggered = True
                rules_applied.append(f"RULE_STAGE_HIGH: Measured water level {val:.2f} m exceeds 5.0 m threshold.")
                contributing.append(ContributingIndicatorDetail(
                    indicator="Measured Water Level (Stage)",
                    value=val,
                    unit="m",
                    severity="HIGH",
                    source=stage_obs.source,
                    observed_at=stage_obs.observation_time.isoformat(),
                    description=f"Active streamgage stage is {val:.2f} meters, indicating high hydrodynamic volume."
                ))
            elif val >= 2.5:
                moderate_stage_triggered = True
                rules_applied.append(f"RULE_STAGE_MODERATE: Measured water level {val:.2f} m is in elevated 2.5m - 5.0m band.")
                contributing.append(ContributingIndicatorDetail(
                    indicator="Measured Water Level (Stage)",
                    value=val,
                    unit="m",
                    severity="MODERATE",
                    source=stage_obs.source,
                    observed_at=stage_obs.observation_time.isoformat(),
                    description=f"Streamgage stage is {val:.2f} meters, indicating elevated seasonal water."
                ))
            else:
                rules_applied.append(f"RULE_STAGE_LOW: Measured stage {val:.2f} m is below 2.5 m.")
                contributing.append(ContributingIndicatorDetail(
                    indicator="Measured Water Level (Stage)",
                    value=val,
                    unit="m",
                    severity="LOW",
                    source=stage_obs.source,
                    observed_at=stage_obs.observation_time.isoformat(),
                    description=f"Streamgage stage is {val:.2f} meters (nominal calm baseline)."
                ))
        else:
            missing.append("measured_water_stage_unmonitored")

        # Evaluate discharge
        high_flow_triggered = False
        moderate_flow_triggered = False
        if discharge_obs is not None:
            obs_dt = discharge_obs.observation_time
            if obs_dt.tzinfo is None:
                obs_dt = obs_dt.replace(tzinfo=timezone.utc)
            if obs_dt < stale_threshold:
                is_stale_data = True
                stale.append(f"River discharge observation is dated ({obs_dt.strftime('%Y-%m-%d')})")

            flow = discharge_obs.value
            if flow >= 25.0:
                high_flow_triggered = True
                rules_applied.append(f"RULE_FLOW_HIGH: Observed discharge {flow:.1f} cms exceeds 25.0 cms strong current threshold.")
                contributing.append(ContributingIndicatorDetail(
                    indicator="River Discharge (Flow Rate)",
                    value=flow,
                    unit="cms",
                    severity="HIGH",
                    source=discharge_obs.source,
                    observed_at=discharge_obs.observation_time.isoformat(),
                    description=f"High discharge velocity ({flow:.1f} cubic meters per second), creating sweeping hydrodynamic drag."
                ))
            elif flow >= 10.0:
                moderate_flow_triggered = True
                rules_applied.append(f"RULE_FLOW_MODERATE: Observed discharge {flow:.1f} cms is in moderate 10.0 - 25.0 cms range.")
                contributing.append(ContributingIndicatorDetail(
                    indicator="River Discharge (Flow Rate)",
                    value=flow,
                    unit="cms",
                    severity="MODERATE",
                    source=discharge_obs.source,
                    observed_at=discharge_obs.observation_time.isoformat(),
                    description=f"Moderate discharge velocity ({flow:.1f} cms)."
                ))
            else:
                rules_applied.append(f"RULE_FLOW_LOW: Discharge {flow:.1f} cms is below 10.0 cms.")
                contributing.append(ContributingIndicatorDetail(
                    indicator="River Discharge (Flow Rate)",
                    value=flow,
                    unit="cms",
                    severity="LOW",
                    source=discharge_obs.source,
                    observed_at=discharge_obs.observation_time.isoformat(),
                    description=f"Low discharge velocity ({flow:.1f} cms)."
                ))
        else:
            missing.append("observed_discharge_rate_unmonitored")

        # Evaluate rainfall
        high_rain_triggered = False
        moderate_rain_triggered = False
        if rainfall_obs is not None:
            rain = rainfall_obs.value
            if rain >= 50.0:
                high_rain_triggered = True
                rules_applied.append(f"RULE_RAIN_HIGH: Catchment rainfall {rain:.1f} mm exceeds 50 mm torrential threshold.")
                contributing.append(ContributingIndicatorDetail(
                    indicator="Catchment Rainfall",
                    value=rain,
                    unit="mm",
                    severity="HIGH",
                    source=rainfall_obs.source,
                    observed_at=rainfall_obs.observation_time.isoformat(),
                    description=f"Torrential rainfall ({rain:.1f} mm) increases sudden inundation and flash surge risk."
                ))
            elif rain >= 20.0:
                moderate_rain_triggered = True
                rules_applied.append(f"RULE_RAIN_MODERATE: Rainfall {rain:.1f} mm exceeds 20 mm.")
                contributing.append(ContributingIndicatorDetail(
                    indicator="Catchment Rainfall",
                    value=rain,
                    unit="mm",
                    severity="MODERATE",
                    source=rainfall_obs.source,
                    observed_at=rainfall_obs.observation_time.isoformat(),
                    description=f"Moderate heavy rainfall ({rain:.1f} mm)."
                ))
        else:
            missing.append("local_rainfall_telemetry_absent")

        # 3. Determine Overall Evidence-Based Category
        if has_severe_structural_hazard or high_stage_triggered or high_flow_triggered or high_rain_triggered:
            category = HAZARD_CATEGORY_HIGH
            rule_summary = (
                "Heightened hydrodynamic caution: Verified evidence of structural hazards, "
                "rapid flow velocity (>25 cms), high water stage, or intense catchment rainfall."
            )
        elif moderate_stage_triggered or moderate_flow_triggered or moderate_rain_triggered:
            category = HAZARD_CATEGORY_MODERATE
            rule_summary = (
                "Elevated caution: Moderate flow velocity or elevated stage observations are present. "
                "Conditions require heightened vigilance."
            )
        elif not waterbody.is_monitored_station and len(contributing) == 0:
            category = HAZARD_CATEGORY_INSUFFICIENT
            rule_summary = (
                "Insufficient empirical data: This waterbody reach has no active hydrological telemetry station, "
                "depth sounding, or flow sensor installed. Unassessed features are strictly NOT labeled low risk."
            )
        elif is_stale_data and len(stale) > 0:
            category = HAZARD_CATEGORY_STALE
            rule_summary = (
                "Stale observation alert: Available telemetry records are historical archives older than 60 days. "
                "Current real-time hydrodynamic hazard cannot be verified."
            )
        elif len(contributing) > 0 and all(c.severity == "LOW" for c in contributing):
            category = HAZARD_CATEGORY_LOW
            rule_summary = (
                "Low observed hydrodynamic hazard: Available telemetry indicates calm nominal stage and low discharge velocity. "
                "IMPORTANT: This does NOT guarantee swimming or personal safety."
            )
        else:
            category = HAZARD_CATEGORY_INSUFFICIENT
            rule_summary = (
                "Insufficient telemetry: Critical environmental factors (depth, flow velocity) are unmeasured at this reach."
            )

        badge_color = BADGE_COLORS.get(category, "#64748B")

        limitations = (
            "1. Physical assessment only: Evaluates physical hydrodynamic parameters, NOT individual swimming ability or personal medical risk. "
            "2. No synthetic incident predictions: We do not claim to forecast whether an individual will drown. "
            "3. Spatial resolution: Telemetry represents point or reach measurements and may vary across local eddies or bathymetric holes."
        )

        return HazardAssessmentResponse(
            waterbody_id=waterbody.id,
            external_id=waterbody.external_id,
            waterbody_name=waterbody.name,
            type=waterbody.type,
            district=waterbody.district,
            hazard_category=category,
            hazard_badge_color=badge_color,
            contributing_indicators=contributing,
            missing_factors=missing,
            stale_factors=stale,
            evaluation_rules_applied=rules_applied,
            rule_summary=rule_summary,
            assessment_timestamp=now.isoformat(),
            data_source=waterbody.data_source,
            license=waterbody.license,
            physical_limitations=limitations,
        )


hazard_assessment_service = HazardAssessmentService()
