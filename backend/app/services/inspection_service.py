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
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.water_body import WaterBodyModel
from app.models.inspection import InspectionRecordModel
from app.schemas.inspection import (
    SiteInspectionPriorityItem,
    InspectionPrioritizationResponse,
    InspectionCreateRequest,
    InspectionUpdateRequest,
    InspectionRecordResponse,
    InspectionListResponse,
    InspectionTrendItem,
    InspectionTrendsResponse,
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
    Evaluates all registered water bodies and ranks them into actionable inspection priority tiers,
    with persistent tracking of official site audits and remediation lifecycle.
    """

    def get_prioritization(self, db: Session) -> InspectionPrioritizationResponse:
        now_utc = datetime.now(timezone.utc)
        water_bodies: List[WaterBodyModel] = db.query(WaterBodyModel).all()

        prioritized_items: List[SiteInspectionPriorityItem] = []

        # Pre-fetch latest completed inspection date per water body from database
        latest_completed_map: Dict[int, str] = {}
        try:
            completed_records = (
                db.query(InspectionRecordModel)
                .filter(InspectionRecordModel.status == "COMPLETED")
                .order_by(desc(InspectionRecordModel.completed_date))
                .all()
            )
            for rec in completed_records:
                if rec.water_body_id not in latest_completed_map and rec.completed_date:
                    latest_completed_map[rec.water_body_id] = rec.completed_date.strftime("%Y-%m-%d")
        except Exception:
            pass  # Table might be empty or in-memory test session

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

            # 7. Last inspection date: Truthful data from database records
            last_insp_date = latest_completed_map.get(wb.id, None)

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

    def create_inspection(self, db: Session, req: InspectionCreateRequest) -> InspectionRecordResponse:
        """
        Creates and persists a new site inspection assignment.
        Automatically snapshots current hazard and priority scores for the location.
        """
        wb = db.query(WaterBodyModel).filter(WaterBodyModel.id == req.water_body_id).first()
        if not wb:
            raise ValueError(f"Water body #{req.water_body_id} does not exist in database.")

        assessment = drowning_risk_service.assess_drowning_risk(water_body=wb)
        hazard_score = assessment.layer_a_environmental_hazard.hazard_score
        composite_score = assessment.risk_score
        wb_type = (wb.type or "river").lower()

        # Compute priority score
        nearest_station, distance_km = find_nearest_telemetry_station(wb.latitude, wb.longitude)
        uncertainty_penalty = 15.0 if assessment.data_freshness_status in ("HISTORICAL_BASELINE", "UNAVAILABLE") else 0.0
        if distance_km and distance_km > 25.0:
            uncertainty_penalty += 5.0

        base_score = 0.40 * hazard_score + 0.35 * assessment.layer_b_contextual_risk.vulnerability_score + uncertainty_penalty
        if wb_type in ("quarry", "abandoned_quarry"):
            base_score = max(base_score, 72.0)
        priority_score = round(float(min(100.0, max(0.0, base_score))), 1)

        if priority_score >= 75.0 or (wb_type == "quarry" and priority_score >= 70.0):
            priority_tier = "CRITICAL"
        elif priority_score >= 60.0:
            priority_tier = "HIGH"
        elif priority_score >= 40.0:
            priority_tier = "MEDIUM"
        else:
            priority_tier = "ROUTINE"

        suggested = req.suggested_focus if req.suggested_focus else [
            "Inspect perimeter barriers and warning signage",
            "Audit depth markers and safe egress foothold condition",
            "Verify presence of emergency flotation equipment",
        ]

        now_utc = datetime.now(timezone.utc)
        record = InspectionRecordModel(
            water_body_id=wb.id,
            water_body_name=wb.name,
            water_body_type=wb.type,
            district=wb.basin_region or "Kerala",
            priority_tier=priority_tier,
            priority_rank_score=priority_score,
            status="SCHEDULED",
            inspector_name=req.inspector_name or "Unassigned Authority Team",
            scheduled_date=req.scheduled_date or now_utc,
            environmental_hazard_score=hazard_score,
            composite_risk_score=composite_score,
            findings_notes=req.findings_notes,
            action_required=False,
            created_at=now_utc,
            updated_at=now_utc,
        )
        record.contributing_factors = assessment.primary_hazards[:3]
        record.suggested_focus = suggested
        record.safety_measures_verified = []

        db.add(record)
        db.commit()
        db.refresh(record)

        return self._record_to_response(record)

    def list_inspections(
        self,
        db: Session,
        status: Optional[str] = None,
        water_body_id: Optional[int] = None,
        priority_tier: Optional[str] = None,
        action_required: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> InspectionListResponse:
        """
        Lists persisted inspection records with multi-dimensional filtering and status metrics.
        """
        query = db.query(InspectionRecordModel)

        if status:
            query = query.filter(InspectionRecordModel.status == status.upper())
        if water_body_id is not None:
            query = query.filter(InspectionRecordModel.water_body_id == water_body_id)
        if priority_tier:
            query = query.filter(InspectionRecordModel.priority_tier == priority_tier.upper())
        if action_required is not None:
            query = query.filter(InspectionRecordModel.action_required == action_required)

        total = query.count()
        records = query.order_by(desc(InspectionRecordModel.created_at)).offset(offset).limit(limit).all()

        # Calculate counts
        all_query = db.query(InspectionRecordModel)
        if water_body_id is not None:
            all_query = all_query.filter(InspectionRecordModel.water_body_id == water_body_id)

        scheduled_cnt = all_query.filter(InspectionRecordModel.status == "SCHEDULED").count()
        in_progress_cnt = all_query.filter(InspectionRecordModel.status == "IN_PROGRESS").count()
        completed_cnt = all_query.filter(InspectionRecordModel.status == "COMPLETED").count()
        cancelled_cnt = all_query.filter(InspectionRecordModel.status == "CANCELLED").count()
        action_req_cnt = all_query.filter(InspectionRecordModel.action_required == True).count()

        return InspectionListResponse(
            total=total,
            scheduled_count=scheduled_cnt,
            in_progress_count=in_progress_cnt,
            completed_count=completed_cnt,
            cancelled_count=cancelled_cnt,
            action_required_count=action_req_cnt,
            inspections=[self._record_to_response(r) for r in records],
        )

    def get_inspection_by_id(self, db: Session, inspection_id: int) -> Optional[InspectionRecordResponse]:
        record = db.query(InspectionRecordModel).filter(InspectionRecordModel.id == inspection_id).first()
        return self._record_to_response(record) if record else None

    def update_inspection(
        self,
        db: Session,
        inspection_id: int,
        req: InspectionUpdateRequest,
    ) -> Optional[InspectionRecordResponse]:
        """
        Updates an inspection's status, inspector findings, verified safety measures, and remediation flags.
        """
        record = db.query(InspectionRecordModel).filter(InspectionRecordModel.id == inspection_id).first()
        if not record:
            return None

        now_utc = datetime.now(timezone.utc)
        if req.status is not None:
            record.status = req.status.upper()
            if record.status == "COMPLETED" and not record.completed_date:
                record.completed_date = req.completed_date or now_utc
        if req.inspector_name is not None:
            record.inspector_name = req.inspector_name
        if req.findings_notes is not None:
            record.findings_notes = req.findings_notes
        if req.safety_measures_verified is not None:
            record.safety_measures_verified = req.safety_measures_verified
        if req.action_required is not None:
            record.action_required = req.action_required
        if req.completed_date is not None:
            record.completed_date = req.completed_date

        record.updated_at = now_utc
        db.commit()
        db.refresh(record)

        return self._record_to_response(record)

    def get_inspection_trends(self, db: Session) -> InspectionTrendsResponse:
        """
        Calculates inspection volume and priority trends across historical records.
        Truthful requirement: Displays trends only when sufficient historical records exist (>= 5 records).
        """
        records = db.query(InspectionRecordModel).order_by(InspectionRecordModel.created_at).all()
        total_count = len(records)
        min_required = 5

        if total_count < min_required:
            return InspectionTrendsResponse(
                has_sufficient_history=False,
                total_records=total_count,
                minimum_required_records=min_required,
                summary=(
                    f"Insufficient historical inspection data ({total_count}/{min_required} records). "
                    f"Log at least {min_required} formal audits to generate statistical trend projections."
                ),
                trends=[],
            )

        # Group by month/period
        period_groups: Dict[str, List[InspectionRecordModel]] = {}
        for r in records:
            period_key = r.created_at.strftime("%Y-%m") if r.created_at else "Historical"
            if period_key not in period_groups:
                period_groups[period_key] = []
            period_groups[period_key].append(r)

        trend_items = []
        for period, group in sorted(period_groups.items()):
            comp_cnt = sum(1 for item in group if item.status == "COMPLETED")
            action_cnt = sum(1 for item in group if item.action_required)
            avg_score = round(sum(item.priority_rank_score for item in group) / max(len(group), 1), 1)
            trend_items.append(
                InspectionTrendItem(
                    period=period,
                    total_inspections=len(group),
                    completed_count=comp_cnt,
                    action_required_count=action_cnt,
                    avg_priority_score=avg_score,
                )
            )

        return InspectionTrendsResponse(
            has_sufficient_history=True,
            total_records=total_count,
            minimum_required_records=min_required,
            summary=f"Analyzed {total_count} official site inspection records across {len(trend_items)} monitoring periods.",
            trends=trend_items,
        )

    def _record_to_response(self, record: InspectionRecordModel) -> InspectionRecordResponse:
        return InspectionRecordResponse(
            id=record.id,
            water_body_id=record.water_body_id,
            water_body_name=record.water_body_name,
            water_body_type=record.water_body_type,
            district=record.district,
            priority_tier=record.priority_tier,
            priority_rank_score=record.priority_rank_score,
            status=record.status,
            inspector_name=record.inspector_name,
            scheduled_date=record.scheduled_date,
            completed_date=record.completed_date,
            environmental_hazard_score=record.environmental_hazard_score,
            composite_risk_score=record.composite_risk_score,
            contributing_factors=record.contributing_factors,
            suggested_focus=record.suggested_focus,
            safety_measures_verified=record.safety_measures_verified,
            findings_notes=record.findings_notes,
            action_required=record.action_required,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )


inspection_service = InspectionService()

