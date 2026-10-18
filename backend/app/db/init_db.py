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
from sqlalchemy.orm import Session
from app.db.session import engine, Base, SessionLocal
from app.models.water_body import WaterBodyModel
from app.models.alert import AlertModel
from app.models.alert_delivery import AlertDeliveryModel

def init_database():
    # Create all tables in SQLite
    Base.metadata.create_all(bind=engine)
    
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
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
    print("Database initialized successfully with synthetic benchmark records.")
