"""
AQUORA AI - Mapped Waterbodies & Telemetry Observation Models.
Stores geospatial vector geometries (LineStrings, Polygons, Points) for Kerala waterbodies,
linked hydrological telemetry observations, and transparent rule-based hazard assessments.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship

try:
    from app.db.session import Base
except ImportError:
    from backend.app.db.session import Base


class MappedWaterbodyModel(Base):
    """
    Represents an authentically mapped Kerala water feature (river reach, stream, lake,
    reservoir, pond, canal, quarry, waterfall, or monitored station).
    Preserves line/polygon vector geometries, provenance attribution, and hazard classification.
    """
    __tablename__ = "mapped_waterbodies"
    __table_args__ = (
        Index("idx_waterbody_bbox", "bbox_min_lat", "bbox_max_lat", "bbox_min_lon", "bbox_max_lon"),
        Index("idx_waterbody_type_dist", "type", "district"),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    external_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. "osm-way-10001", "cwc-st-pala"
    name = Column(String(150), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True) # river, stream, lake, pond, reservoir, canal, quarry, waterfall, station
    geometry_type = Column(String(30), nullable=False) # LineString, Polygon, Point
    coordinates_json = Column(Text, nullable=False) # Serialized GeoJSON coordinate list

    # Bounding box coordinates for spatial filtering & viewport queries
    bbox_min_lat = Column(Float, nullable=False, index=True)
    bbox_min_lon = Column(Float, nullable=False, index=True)
    bbox_max_lat = Column(Float, nullable=False, index=True)
    bbox_max_lon = Column(Float, nullable=False, index=True)

    # Centroid coordinate for labeling and proximity calculation
    centroid_lat = Column(Float, nullable=False, index=True)
    centroid_lon = Column(Float, nullable=False, index=True)

    district = Column(String(80), nullable=True, index=True) # Kerala district (e.g. Ernakulam, Wayanad)
    basin_region = Column(String(120), nullable=True, index=True) # Watershed / River basin jurisdiction
    length_km = Column(Float, nullable=True) # For linear waterways
    area_sqkm = Column(Float, nullable=True) # For areal waterbodies

    data_source = Column(String(150), nullable=False) # Originating dataset provenance
    license = Column(String(150), nullable=False) # e.g. "Open Database License (ODbL)", "Government Open Data License - India"
    data_quality = Column(String(60), default="verified_public_geodata") # Data quality indicator
    is_monitored_station = Column(Boolean, default=False, index=True) # Whether real telemetry is collected

    # Transparent rule-based hazard classification
    # Categories: HIGH_HAZARD, MODERATE_HAZARD, LOW_OBSERVED_HAZARD, INSUFFICIENT_DATA, STALE_DATA
    hazard_category = Column(String(40), default="INSUFFICIENT_DATA", index=True)
    hazard_assessment_json = Column(Text, nullable=True) # JSON details of rule evaluation
    last_assessed = Column(DateTime, nullable=True)

    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Associated real telemetry observations
    observations = relationship("WaterbodyObservationModel", back_populates="waterbody", cascade="all, delete-orphan")


class WaterbodyObservationModel(Base):
    """
    Stores authentic environmental, hydraulic, and structural observations
    (measured water stage, discharge, rainfall, water temperature, or physical hazard notes).
    """
    __tablename__ = "waterbody_observations"
    __table_args__ = (
        Index("idx_obs_wb_param", "waterbody_id", "parameter_name"),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    waterbody_id = Column(Integer, ForeignKey("mapped_waterbodies.id", ondelete="CASCADE"), nullable=False, index=True)
    station_code = Column(String(80), nullable=True, index=True)
    parameter_name = Column(String(60), nullable=False, index=True) # stage_m, discharge_cms, rainfall_mm, temp_c, structural_hazard
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False) # m, cms, mm, degC, flag
    observation_time = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    is_stale = Column(Boolean, default=False)
    source = Column(String(120), nullable=False) # e.g. "CWC Hydrology Telemetry", "Kerala SW State Network"
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    waterbody = relationship("MappedWaterbodyModel", back_populates="observations")
