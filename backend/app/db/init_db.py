"""
AQUORA AI - Database Initialization & Demonstration Seeder Module.
Ethical Notice: All telemetry, alerts, and hydro-environmental measurements
in this seed script are SYNTHETIC/SIMULATED demonstration benchmark records
designed strictly for prototype testing and system validation. No real drowning
incidents or emergency situations are fabricated.
"""

import os
import sys
from datetime import datetime, timezone

# Ensure project root is available in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from app.db.session import engine, Base, SessionLocal
from app.models.water_body import WaterBodyModel
from app.models.alert import AlertModel
from app.models.alert_delivery import AlertDeliveryModel

def get_demonstration_water_bodies() -> list[WaterBodyModel]:
    """Returns the standardized synthetic demonstration water bodies."""
    now = datetime.now(timezone.utc)
    return [
        WaterBodyModel(
            name="Emerald Bay Reservoir (Demonstration Station)",
            type="reservoir",
            latitude=37.7749,
            longitude=-122.4194,
            current_risk_level="low",
            risk_score=18.5,
            water_temp_c=21.0,
            flow_rate_cms=0.8,
            depth_meters=5.2,
            last_updated=now,
            description="[DEMONSTRATION DATA] Calm sub-alpine reservoir basin with gentle circulation currents.",
            is_demonstration_data=True
        ),
        WaterBodyModel(
            name="Cascade Canyon River (Demonstration Station)",
            type="river",
            latitude=37.8044,
            longitude=-122.2711,
            current_risk_level="high",
            risk_score=76.0,
            water_temp_c=12.5,
            flow_rate_cms=9.4,
            depth_meters=3.8,
            last_updated=now,
            description="[DEMONSTRATION DATA] Steep canyon gorge river with surging snowmelt and dangerous undercurrents.",
            is_demonstration_data=True
        ),
        WaterBodyModel(
            name="Marina Outer Point (Demonstration Station)",
            type="coastal",
            latitude=37.8272,
            longitude=-122.4230,
            current_risk_level="moderate",
            risk_score=52.0,
            water_temp_c=15.1,
            flow_rate_cms=3.6,
            depth_meters=7.0,
            last_updated=now,
            description="[DEMONSTRATION DATA] Coastal inlet with tidal currents and elevated wind chop during incoming tides.",
            is_demonstration_data=True
        ),
        WaterBodyModel(
            name="Blue Ridge Basin (Demonstration Station)",
            type="reservoir",
            latitude=37.7500,
            longitude=-122.3800,
            current_risk_level="low",
            risk_score=14.0,
            water_temp_c=22.0,
            flow_rate_cms=0.4,
            depth_meters=8.5,
            last_updated=now,
            description="[DEMONSTRATION DATA] Controlled municipal reservoir with stable thermal layering and monitored perimeter.",
            is_demonstration_data=True
        ),
        WaterBodyModel(
            name="Silver Rapids Crossing (Demonstration Station)",
            type="river",
            latitude=37.7900,
            longitude=-122.3500,
            current_risk_level="low",
            risk_score=22.0,
            water_temp_c=18.5,
            flow_rate_cms=1.8,
            depth_meters=2.4,
            last_updated=now,
            description="[DEMONSTRATION DATA] Shallow braided river segment with moderate flow velocity and clear visibility.",
            is_demonstration_data=True
        ),
        WaterBodyModel(
            name="Clearwater Lake (Demonstration Station)",
            type="lake",
            latitude=37.8150,
            longitude=-122.3950,
            current_risk_level="low",
            risk_score=16.0,
            water_temp_c=20.0,
            flow_rate_cms=0.5,
            depth_meters=6.0,
            last_updated=now,
            description="[DEMONSTRATION DATA] Natural lake basin with nominal wave action and ambient recreational temperatures.",
            is_demonstration_data=True
        ),
    ]

def init_database():
    """Initializes SQLite schema tables and populates baseline demonstration records if empty."""
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        existing_count = db.query(WaterBodyModel).count()
        if existing_count == 0:
            sample_water_bodies = get_demonstration_water_bodies()
            db.add_all(sample_water_bodies)
            db.commit()

            # Seed standard initial alert
            cascade_station = db.query(WaterBodyModel).filter(
                WaterBodyModel.name.like("%Cascade%")
            ).first()

            if cascade_station:
                sample_alert = AlertModel(
                    water_body_id=cascade_station.id,
                    water_body_name=cascade_station.name,
                    severity="high",
                    message="[DEMONSTRATION ALERT] Water flow velocity elevated past safe threshold (9.4 m³/s). Swimming discouraged.",
                    timestamp=datetime.now(timezone.utc),
                    is_demonstration_data=True
                )
                db.add(sample_alert)
                db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
    print("Database initialized successfully with synthetic benchmark records.")
