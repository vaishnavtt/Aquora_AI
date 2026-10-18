"""
Database initialization and synthetic test dataset seeder.
Notice: All telemetry data is synthetic/simulated for hackathon prototype testing.
"""

import os
import sys

# Ensure root directory is on sys.path if run directly
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import engine, Base, SessionLocal
from app.models.water_body import WaterBodyModel
from app.models.alert import AlertModel
from app.models.alert_delivery import AlertDeliveryModel

def init_database():
    # Create all tables in SQLite
    Base.metadata.create_all(bind=engine)

    # Migrate any missing columns if table pre-existed
    with engine.connect() as conn:
        for col_name, col_type in [
            ("elevation_meters", "FLOAT"),
            ("basin_region", "VARCHAR(100)"),
            ("data_source", "VARCHAR(100)"),
            ("description", "TEXT"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE water_bodies ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass  # column already exists
    
    db: Session = SessionLocal()
    try:
        # Check if water bodies already exist
        existing_count = db.query(WaterBodyModel).count()
        if existing_count == 0:
            sample_water_bodies = [
                WaterBodyModel(
                    name="Station Emerald (Simulated Lake)",
                    type="lake",
                    latitude=37.7749,
                    longitude=-122.4194,
                    current_risk_level="low",
                    risk_score=18.5,
                    water_temp_c=20.5,
                    flow_rate_cms=0.8,
                    depth_meters=4.5,
                    elevation_meters=142.0,
                    basin_region="San Francisco Bay Basin",
                    data_source="Synthetic Prototype Node",
                    description="Sub-alpine protected lake basin with stable bathymetry and mild circulation currents.",
                    last_updated=datetime.now(timezone.utc)
                ),
                WaterBodyModel(
                    name="Station Cascade (Simulated River)",
                    type="river",
                    latitude=37.8044,
                    longitude=-122.2711,
                    current_risk_level="high",
                    risk_score=76.2,
                    water_temp_c=12.0,
                    flow_rate_cms=8.8,
                    depth_meters=3.2,
                    elevation_meters=88.5,
                    basin_region="San Francisco Bay Basin",
                    data_source="Synthetic Prototype Node",
                    description="Steep canyon river gorge with seasonal surge snowmelt and dangerous undercurrents.",
                    last_updated=datetime.now(timezone.utc)
                ),
                WaterBodyModel(
                    name="Station Marina (Simulated Coastal)",
                    type="coastal",
                    latitude=37.8272,
                    longitude=-122.4230,
                    current_risk_level="moderate",
                    risk_score=48.0,
                    water_temp_c=15.2,
                    flow_rate_cms=3.5,
                    depth_meters=7.0,
                    elevation_meters=2.0,
                    basin_region="Pacific Coastal Drainage",
                    data_source="Synthetic Prototype Node",
                    description="Tidal coastal inlet subject to localized rip currents and afternoon gale chop.",
                    last_updated=datetime.now(timezone.utc)
                ),
                WaterBodyModel(
                    name="Station Blue Ridge (Simulated Reservoir)",
                    type="reservoir",
                    latitude=37.7500,
                    longitude=-122.3800,
                    current_risk_level="low",
                    risk_score=14.0,
                    water_temp_c=22.0,
                    flow_rate_cms=0.4,
                    depth_meters=8.5,
                    elevation_meters=210.0,
                    basin_region="Central Valley Basin",
                    data_source="Synthetic Prototype Node",
                    description="Regulated municipal reservoir with perimeter surveillance and thermal stratification.",
                    last_updated=datetime.now(timezone.utc)
                ),
                WaterBodyModel(
                    name="Station Silver Rapids (Simulated River)",
                    type="river",
                    latitude=37.7900,
                    longitude=-122.3500,
                    current_risk_level="moderate",
                    risk_score=52.0,
                    water_temp_c=16.0,
                    flow_rate_cms=4.2,
                    depth_meters=2.8,
                    elevation_meters=65.0,
                    basin_region="San Francisco Bay Basin",
                    data_source="Synthetic Prototype Node",
                    description="Braided river section with boulder friction and localized vortex eddies.",
                    last_updated=datetime.now(timezone.utc)
                ),
                WaterBodyModel(
                    name="USGS Station 11164500 (San Francisquito Creek)",
                    type="river",
                    latitude=37.4261,
                    longitude=-122.1708,
                    current_risk_level="low",
                    risk_score=16.0,
                    water_temp_c=17.5,
                    flow_rate_cms=0.002,
                    depth_meters=0.05,
                    elevation_meters=35.05,
                    basin_region="San Francisco Bay Hydrologic Unit",
                    data_source="U.S. Geological Survey (USGS NWIS)",
                    description="Active USGS streamgage station 11164500 at Stanford University, CA. Verified real-time telemetry node.",
                    last_updated=datetime.now(timezone.utc)
                ),
                WaterBodyModel(
                    name="Ramamangalam Bridge (Kerala SW)",
                    type="river",
                    latitude=9.9482,
                    longitude=76.5412,
                    current_risk_level="low",
                    risk_score=22.0,
                    water_temp_c=28.5,
                    flow_rate_cms=3.8,
                    depth_meters=2.16,
                    elevation_meters=12.5,
                    basin_region="Muvattupuzha River Basin",
                    data_source="Kerala State Water Resources Department (Kerala SW)",
                    description="Official CWC/Kerala SW hydrological monitoring station at Ramamangalam Bridge, Ernakulam District, Kerala.",
                    last_updated=datetime.now(timezone.utc)
                ),
            ]
            db.add_all(sample_water_bodies)
            db.commit()

            # Add sample initial alert
            cascade_station = db.query(WaterBodyModel).filter(WaterBodyModel.name.like("%Cascade%")).first()
            if cascade_station:
                sample_alert = AlertModel(
                    water_body_id=cascade_station.id,
                    water_body_name=cascade_station.name,
                    severity="high",
                    message="Flow velocity elevated past safe threshold (8.8 m³/s). Swimming discouraged.",
                    timestamp=datetime.now(timezone.utc)
                )
                db.add(sample_alert)
                db.commit()
        else:
            # Upgrade existing water bodies if geographic metadata is missing
            metadata_map = {
                1: (142.0, "San Francisco Bay Basin", "Synthetic Prototype Node", "Sub-alpine protected lake basin with stable bathymetry and mild circulation currents."),
                2: (88.5, "San Francisco Bay Basin", "Synthetic Prototype Node", "Steep canyon river gorge with seasonal surge snowmelt and dangerous undercurrents."),
                3: (2.0, "Pacific Coastal Drainage", "Synthetic Prototype Node", "Tidal coastal inlet subject to localized rip currents and afternoon gale chop."),
                4: (210.0, "Central Valley Basin", "Synthetic Prototype Node", "Regulated municipal reservoir with perimeter surveillance and thermal stratification."),
                5: (65.0, "San Francisco Bay Basin", "Synthetic Prototype Node", "Braided river section with boulder friction and localized vortex eddies."),
            }
            for wb_id, (elev, basin, source, desc) in metadata_map.items():
                wb = db.query(WaterBodyModel).filter(WaterBodyModel.id == wb_id).first()
                if wb and wb.elevation_meters is None:
                    wb.elevation_meters = elev
                    wb.basin_region = basin
                    wb.data_source = source
                    wb.description = desc

            # Ensure USGS station exists
            usgs_exists = db.query(WaterBodyModel).filter(WaterBodyModel.name.like("%11164500%")).first()
            if not usgs_exists:
                db.add(
                    WaterBodyModel(
                        name="USGS Station 11164500 (San Francisquito Creek)",
                        type="river",
                        latitude=37.4261,
                        longitude=-122.1708,
                        current_risk_level="low",
                        risk_score=16.0,
                        water_temp_c=17.5,
                        flow_rate_cms=0.002,
                        depth_meters=0.05,
                        elevation_meters=35.05,
                        basin_region="San Francisco Bay Hydrologic Unit",
                        data_source="U.S. Geological Survey (USGS NWIS)",
                        description="Active USGS streamgage station 11164500 at Stanford University, CA. Verified real-time telemetry node.",
                        last_updated=datetime.now(timezone.utc)
                    )
                )

            # Ensure Ramamangalam Bridge exists
            kerala_exists = db.query(WaterBodyModel).filter(WaterBodyModel.name.like("%Ramamangalam%")).first()
            if not kerala_exists:
                db.add(
                    WaterBodyModel(
                        name="Ramamangalam Bridge (Kerala SW)",
                        type="river",
                        latitude=9.9482,
                        longitude=76.5412,
                        current_risk_level="low",
                        risk_score=22.0,
                        water_temp_c=28.5,
                        flow_rate_cms=3.8,
                        depth_meters=2.16,
                        elevation_meters=12.5,
                        basin_region="Muvattupuzha River Basin",
                        data_source="Kerala State Water Resources Department (Kerala SW)",
                        description="Official CWC/Kerala SW hydrological monitoring station at Ramamangalam Bridge, Ernakulam District, Kerala.",
                        last_updated=datetime.now(timezone.utc)
                    )
                )
            db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
    print("Database initialized successfully with synthetic benchmark records.")
