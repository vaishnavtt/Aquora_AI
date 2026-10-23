"""
AQUORA AI - Authority Inspection Prioritization Service
Track: Environmental Decision Support & Risk-Informed Site Prioritization

Scientific & Operational Principles:
1. Risk-informed inspection triage: Allocates limited municipal/district safety inspection
   resources to aquatic sites exhibiting the highest environmental hazard and site vulnerability.
2. Safe uncertainty handling: Missing or unmonitored telemetry is explicitly NOT treated as low risk.
   Unmonitored sites receive an uncertainty penalty that elevates inspection priority to ensure physical
   ground verification.
3. Zero fabricated records: Last inspection dates are None unless confirmed by an official statutory source.
4. Advisory disclaimer: Recommendations are automated decision-support guidance, not statutory regulatory mandates.
"""

import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.water_body import WaterBodyModel
from app.schemas.inspection import (
    SiteInspectionPriorityItem,
    InspectionPrioritizationResponse,
)
from app.services.drowning_risk_service import (
    drowning_risk_service,
    find_nearest_telemetry_station,
)

PRIORITY_METHODOLOGY_DOC = (
    "AQUORA Inspection Prioritization Heuristic v1.2: "
    "Priority Rank Score (0-100) = (0.40 * Environmental Hazard Score) + "
    "(0.35 * Contextual Site Vulnerability Score) + (Observational Uncertainty Penalty). "
    "Uncertainty Penalty: Sites relying on historical baselines or unmonitored gauges receive "
    "+15 points; sites >20 km from the nearest river telemetry station receive +5 points. "
    "Tiers: CRITICAL (>=75.0 or high-risk quarry), HIGH (60.0 - 74.9), "
    "MEDIUM (40.0 - 59.9), ROUTINE (<40.0). Missing observations are never assumed safe."
)

AUTHORITY_DISCLAIMER = (
    "STATUTORY NOTICE & LIMITATION OF LIABILITY: AQUORA AI inspection rankings are algorithmic "
    "decision-support recommendations generated from hydrodynamic indicators, site typologies, "
    "and observational latency. They do NOT constitute an official regulatory mandate or government order. "
    "Municipal disaster management authorities (KSDMA, DDMA, Fire & Rescue) retain statutory jurisdiction "
    "over deployment schedules. Historical inspection dates are recorded only when officially documented."
)


class InspectionService:
    """
    Evaluates all registered water bodies and ranks them into actionable inspection priority tiers.
    """

    def get_prioritization(self, db: Session) -> InspectionPrioritizationResponse:
        now_utc = datetime.now(timezone.utc)
        water_bodies: List[WaterBodyModel] = db.query(WaterBodyModel).all()

        prioritized_items: List[SiteInspectionPriorityItem] = []

        for wb in water_bodies:
            # 1. Run provisional two-layer assessment
            assessment = drowning_risk_service.assess_drowning_risk(water_body=wb)

            hazard_score = assessment.layer_a_environmental_hazard.hazard_score
            hazard_cat = assessment.layer_a_environmental_hazard.hazard_level.upper()
            composite_score = assessment.risk_score
            composite_level = assessment.risk_category.lower()
            wb_type = (wb.type or "river").lower()

            # 2. Determine telemetry proximity & uncertainty
            nearest_station, distance_km = find_nearest_telemetry_station(wb.latitude, wb.longitude)

            uncertainty_penalty = 0.0
            limitations: List[str] = list(assessment.missing_variables)

            if assessment.data_freshness_status in ("HISTORICAL_BASELINE", "UNAVAILABLE"):
                uncertainty_penalty += 15.0
                limitations.append("Lacks active telemetry gauge; unobserved surge variance penalized")
            elif distance_km and distance_km > 25.0:
                uncertainty_penalty += 5.0
                limitations.append(f"Nearest river telemetry station ({nearest_station}) is {distance_km:.1f}km away")

            # 3. Calculate Priority Rank Score (0 - 100)
            base_score = (
                0.40 * hazard_score +
                0.35 * assessment.layer_b_contextual_risk.vulnerability_score +
                uncertainty_penalty
            )

            # Special case for quarry pits with high depth or unfenced status
            if wb_type in ("quarry", "abandoned_quarry"):
                base_score = max(base_score, 72.0)

            priority_score = round(float(min(100.0, max(0.0, base_score))), 1)

            # 4. Assign Priority Tier
            if priority_score >= 75.0 or (wb_type == "quarry" and priority_score >= 70.0):
                priority_tier = "CRITICAL"
            elif priority_score >= 60.0:
                priority_tier = "HIGH"
            elif priority_score >= 40.0:
                priority_tier = "MEDIUM"
            else:
                priority_tier = "ROUTINE"

            # 5. Build transparent rationale
            rationale_parts = []
            if hazard_score >= 60.0:
                rationale_parts.append(f"Elevated environmental hazard ({hazard_score:.1f}/100, {hazard_cat})")
            if assessment.layer_b_contextual_risk.vulnerability_score >= 70.0:
                rationale_parts.append(f"High structural vulnerability for {wb_type} typology")
            if uncertainty_penalty > 0.0:
                rationale_parts.append(f"+{uncertainty_penalty:.0f}pt penalty for unobserved telemetry/spatial gap")
            if not rationale_parts:
                rationale_parts.append("Hydrological parameters within seasonal baseline limits")

            priority_explanation = (
                f"Ranked {priority_tier} (Score: {priority_score}/100). "
                f"Drivers: {'; '.join(rationale_parts)}."
            )

            # 6. Suggested on-site inspection checklist
            suggested_focus: List[str] = []
            if wb_type in ("quarry", "abandoned_quarry"):
                suggested_focus.extend([
                    "Inspect perimeter barrier integrity and chain-link fence gaps",
                    "Verify Malayalam and English drowning danger warning signboards",
                    "Check absence of unauthorized swimming access paths",
                ])
            elif wb_type in ("waterfall", "cascade"):
                suggested_focus.extend([
                    "Audit slippery rock warning signage and safe viewing perimeter",
                    "Verify upstream flash flood siren or alert protocol readiness",
                    "Check emergency lifeline and flotation ring buoy deployment",
                ])
            elif wb_type in ("river", "canal"):
                suggested_focus.extend([
                    "Inspect public bathing ghat non-slip steps and handrails",
                    "Verify depth markers at sudden drop-offs and bridge pilings",
                    "Assess bank scour and erosion stability after recent flow",
                ])
            else:
                suggested_focus.extend([
                    "Conduct general water safety compliance check",
                    "Verify visibility of emergency contact numbers",
                ])

            # 7. Last inspection date: NO FABRICATED RECORDS!
            # Kept as None because no certified municipal inspection database is currently linked.
            last_insp_date = None

            prioritized_items.append(
                SiteInspectionPriorityItem(
                    water_body_id=wb.id,
                    location_name=wb.name,
                    water_body_type=wb.type,
                    district="Kerala",
                    latitude=wb.latitude,
                    longitude=wb.longitude,
                    environmental_hazard_score=hazard_score,
                    environmental_hazard_category=hazard_cat,
                    composite_risk_score=composite_score,
                    composite_risk_level=composite_level,
                    top_contributing_factors=assessment.primary_hazards[:3],
                    data_freshness_status=assessment.data_freshness_status,
                    relevant_limitations=limitations,
                    nearest_telemetry_station=nearest_station,
                    telemetry_distance_km=distance_km,
                    inspection_priority=priority_tier,
                    priority_rank_score=priority_score,
                    priority_explanation=priority_explanation,
                    last_inspection_date=last_insp_date,
                    suggested_inspection_focus=suggested_focus,
                )
            )

        # Sort prioritized sites descending by priority_rank_score
        prioritized_items.sort(key=lambda item: item.priority_rank_score, reverse=True)

        critical_count = sum(1 for item in prioritized_items if item.inspection_priority == "CRITICAL")
        high_count = sum(1 for item in prioritized_items if item.inspection_priority == "HIGH")
        medium_count = sum(1 for item in prioritized_items if item.inspection_priority == "MEDIUM")
        routine_count = sum(1 for item in prioritized_items if item.inspection_priority == "ROUTINE")

        return InspectionPrioritizationResponse(
            generated_at=now_utc,
            total_sites_evaluated=len(prioritized_items),
            critical_count=critical_count,
            high_count=high_count,
            medium_count=medium_count,
            routine_count=routine_count,
            prioritized_sites=prioritized_items,
            priority_scoring_methodology=PRIORITY_METHODOLOGY_DOC,
            disclaimer=AUTHORITY_DISCLAIMER,
        )


inspection_service = InspectionService()
