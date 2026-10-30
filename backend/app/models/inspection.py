"""
AQUORA AI - Authority Inspection Record Model
Track: Environmental Decision Support & Risk-Informed Site Prioritization

Persists formal on-site safety audits, scheduled inspections, status transitions,
and authority remediation checklists across monitored water bodies.
"""

from datetime import datetime, timezone
import json
from typing import List, Optional
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship

try:
    from app.db.session import Base
except ImportError:
    from backend.app.db.session import Base


class InspectionRecordModel(Base):
    """
    Persisted record of an official site safety inspection or audit assignment.
    """
    __tablename__ = "inspections"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    water_body_id = Column(Integer, ForeignKey("water_bodies.id", ondelete="CASCADE"), nullable=False, index=True)
    water_body_name = Column(String(200), nullable=False)
    water_body_type = Column(String(50), nullable=False)
    district = Column(String(100), default="Kerala", nullable=False)
    
    # Priority classification at time of inspection scheduling
    priority_tier = Column(String(20), nullable=False, index=True)  # CRITICAL, HIGH, MEDIUM, ROUTINE
    priority_rank_score = Column(Float, nullable=False)
    
    # Status lifecycle
    status = Column(String(20), nullable=False, default="SCHEDULED", index=True)  # SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    
    # Inspector metadata
    inspector_name = Column(String(100), nullable=True)
    scheduled_date = Column(DateTime, nullable=True)
    completed_date = Column(DateTime, nullable=True)
    
    # Quantitative hazard snapshot
    environmental_hazard_score = Column(Float, nullable=True)
    composite_risk_score = Column(Float, nullable=True)
    
    # Structured lists serialized as JSON strings
    contributing_factors_json = Column(Text, nullable=True, default="[]")
    suggested_focus_json = Column(Text, nullable=True, default="[]")
    safety_measures_verified_json = Column(Text, nullable=True, default="[]")
    
    # Qualitative field audit findings
    findings_notes = Column(Text, nullable=True)
    action_required = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    @property
    def contributing_factors(self) -> List[str]:
        if not self.contributing_factors_json:
            return []
        try:
            return json.loads(self.contributing_factors_json)
        except Exception:
            return []

    @contributing_factors.setter
    def contributing_factors(self, val: List[str]):
        self.contributing_factors_json = json.dumps(val or [])

    @property
    def suggested_focus(self) -> List[str]:
        if not self.suggested_focus_json:
            return []
        try:
            return json.loads(self.suggested_focus_json)
        except Exception:
            return []

    @suggested_focus.setter
    def suggested_focus(self, val: List[str]):
        self.suggested_focus_json = json.dumps(val or [])

    @property
    def safety_measures_verified(self) -> List[str]:
        if not self.safety_measures_verified_json:
            return []
        try:
            return json.loads(self.safety_measures_verified_json)
        except Exception:
            return []

    @safety_measures_verified.setter
    def safety_measures_verified(self, val: List[str]):
        self.safety_measures_verified_json = json.dumps(val or [])
