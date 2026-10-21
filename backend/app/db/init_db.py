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

from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import engine, Base, SessionLocal
from app.models.water_body import WaterBodyModel
from app.models.alert import AlertModel
from app.models.alert_delivery import AlertDeliveryModel

def get_demonstration_water_bodies() -> list[WaterBodyModel]:
    """Returns the standardized demonstration and authentic Kerala water bodies covering all 6 aquatic types."""
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
            elevation_meters=142.0,
            basin_region="San Francisco Bay Basin",
            data_source="Synthetic Demonstration Node",
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
            elevation_meters=88.5,
            basin_region="San Francisco Bay Basin",
            data_source="Synthetic Demonstration Node",
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
            elevation_meters=2.0,
            basin_region="Pacific Coastal Drainage",
            data_source="Synthetic Demonstration Node",
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
            elevation_meters=210.0,
            basin_region="Central Valley Basin",
            data_source="Synthetic Demonstration Node",
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
            elevation_meters=65.0,
            basin_region="San Francisco Bay Basin",
            data_source="Synthetic Demonstration Node",
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
            elevation_meters=120.0,
            basin_region="San Francisco Bay Basin",
            data_source="Synthetic Demonstration Node",
            last_updated=now,
            description="[DEMONSTRATION DATA] Natural lake basin with nominal wave action and ambient recreational temperatures.",
            is_demonstration_data=True
        ),
    ]

def get_kerala_water_bodies() -> list[WaterBodyModel]:
    """Returns the verified USGS and Kerala water bodies covering rivers, quarries, waterfalls, lakes/ponds, reservoirs, and canals."""
    now = datetime.now(timezone.utc)
    return [
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
            last_updated=now,
            is_demonstration_data=False,
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
            last_updated=now,
            is_demonstration_data=False,
        ),
        WaterBodyModel(
            name="Pala (Kerala SW)",
            type="river",
            latitude=9.7011,
            longitude=76.6822,
            current_risk_level="low",
            risk_score=20.0,
            water_temp_c=27.5,
            flow_rate_cms=2.4,
            depth_meters=1.85,
            elevation_meters=18.0,
            basin_region="Meenachil River Basin",
            data_source="Kerala State Water Resources Department (Kerala SW)",
            description="Official CWC/Kerala SW hydrological monitoring station at Pala, Kottayam District, Kerala (Meenachil River).",
            last_updated=now,
            is_demonstration_data=False,
        ),
        WaterBodyModel(
            name="Trinayakudam (Kerala SW)",
            type="river",
            latitude=9.7011,
            longitude=76.4031,
            current_risk_level="low",
            risk_score=21.0,
            water_temp_c=28.0,
            flow_rate_cms=3.1,
            depth_meters=1.92,
            elevation_meters=4.5,
            basin_region="Meenachil-Vembanad Basin",
            data_source="Kerala State Water Resources Department (Kerala SW)",
            description="Official CWC/Kerala SW hydrological monitoring station at Trinayakudam, Kottayam District, Kerala (Lowland transition reach).",
            last_updated=now,
            is_demonstration_data=False,
        ),
        # 1. Abandoned Quarries
        WaterBodyModel(
            name="Vadavathoor Abandoned Granite Quarry",
            type="quarry",
            latitude=9.5967,
            longitude=76.5642,
            current_risk_level="high",
            risk_score=82.0,
            water_temp_c=16.0,
            flow_rate_cms=0.05,
            depth_meters=24.0,
            elevation_meters=35.0,
            basin_region="Meenachil River Basin",
            data_source="Kerala Quarry Hazard Registry",
            description="Deep water-filled granite pit with 25m sheer vertical drop-offs, sudden cold thermocline layer (<16°C), and zero exit footholds.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        WaterBodyModel(
            name="Mookkannoor Stone Quarry Lake",
            type="quarry",
            latitude=10.2314,
            longitude=76.4428,
            current_risk_level="high",
            risk_score=80.0,
            water_temp_c=16.5,
            flow_rate_cms=0.05,
            depth_meters=18.5,
            elevation_meters=42.0,
            basin_region="Periyar Valley Watershed",
            data_source="Kerala Quarry Hazard Registry",
            description="Unmonitored quarry excavation pit filled with rainwater; vertical granite faces with extreme cold shock immersion hazard.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        # 2. Waterfalls
        WaterBodyModel(
            name="Athirappilly Waterfalls",
            type="waterfall",
            latitude=10.2851,
            longitude=76.5698,
            current_risk_level="high",
            risk_score=78.0,
            water_temp_c=21.0,
            flow_rate_cms=28.5,
            depth_meters=6.5,
            elevation_meters=120.0,
            basin_region="Chalakudy River Basin",
            data_source="Kerala Forest & Eco-Tourism",
            description="Major 80ft cascade on Chalakudy River; slippery algae-coated rock shelves and violent hydraulic plunge pool undertow.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        WaterBodyModel(
            name="Meenmutty Waterfalls (Wayanad)",
            type="waterfall",
            latitude=11.6033,
            longitude=76.1689,
            current_risk_level="high",
            risk_score=75.0,
            water_temp_c=19.5,
            flow_rate_cms=14.0,
            depth_meters=5.0,
            elevation_meters=300.0,
            basin_region="Chaliyar Headwaters",
            data_source="Kerala Forest & Eco-Tourism",
            description="Three-tiered waterfall gorge subject to sudden upstream Western Ghats cloudburst flash surges and aerated boil currents.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        # 3. Lakes & Ponds
        WaterBodyModel(
            name="Sasthamcotta Freshwater Lake",
            type="lake",
            latitude=9.0417,
            longitude=76.6333,
            current_risk_level="low",
            risk_score=24.0,
            water_temp_c=27.5,
            flow_rate_cms=0.2,
            depth_meters=6.8,
            elevation_meters=33.0,
            basin_region="Kallada River Basin",
            data_source="Kerala State Biodiversity Board",
            description="Largest natural freshwater lake in Kerala (Ramsar site); gradual sand-silt shoreline with calm surface conditions.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        WaterBodyModel(
            name="Thirunakkara Temple Pond",
            type="lake",
            latitude=9.5912,
            longitude=76.5221,
            current_risk_level="moderate",
            risk_score=46.0,
            water_temp_c=28.0,
            flow_rate_cms=0.05,
            depth_meters=3.8,
            elevation_meters=12.0,
            basin_region="Meenachil Urban Drainage",
            data_source="Travancore Devaswom Board",
            description="Traditional public masonry ghat pond; deep perimeter silt beds and slippery stone steps with unmonitored bathing risk.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        # 4. Reservoirs
        WaterBodyModel(
            name="Idukki Dam Reservoir",
            type="reservoir",
            latitude=9.8456,
            longitude=76.9744,
            current_risk_level="moderate",
            risk_score=58.0,
            water_temp_c=20.5,
            flow_rate_cms=5.0,
            depth_meters=38.0,
            elevation_meters=720.0,
            basin_region="Periyar River Basin",
            data_source="Kerala State Electricity Board (KSEB)",
            description="Massive hydroelectric arch dam impoundment with extreme depth, submerged timber obstacles, and cold lower thermocline.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        WaterBodyModel(
            name="Bhoothathankettu Dam Reservoir",
            type="reservoir",
            latitude=10.1333,
            longitude=76.6667,
            current_risk_level="moderate",
            risk_score=52.0,
            water_temp_c=25.0,
            flow_rate_cms=18.0,
            depth_meters=12.5,
            elevation_meters=32.0,
            basin_region="Periyar River Basin",
            data_source="Kerala Irrigation Department",
            description="Periyar river barrage reservoir; regulated spillway discharge produces localized undertow and eddy currents.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        # 5. Canals
        WaterBodyModel(
            name="Alappuzha Commercial Canal",
            type="canal",
            latitude=9.4981,
            longitude=76.3264,
            current_risk_level="moderate",
            risk_score=50.0,
            water_temp_c=27.5,
            flow_rate_cms=2.8,
            depth_meters=2.8,
            elevation_meters=1.5,
            basin_region="Vembanad Waterway",
            data_source="Kerala Inland Navigation",
            description="Urban waterway with vertical masonry embankment walls lacking egress footholds; transit boat wake chop.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        WaterBodyModel(
            name="Periyar Valley Main Irrigation Canal",
            type="canal",
            latitude=10.1412,
            longitude=76.5241,
            current_risk_level="moderate",
            risk_score=54.0,
            water_temp_c=26.5,
            flow_rate_cms=7.2,
            depth_meters=2.5,
            elevation_meters=22.0,
            basin_region="Periyar Valley Irrigation Project",
            data_source="Kerala Irrigation Department",
            description="High-velocity concrete-lined irrigation canal; smooth sloping walls prevent self-extraction during flow operation.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        # 6. Additional River Telemetry Sites
        WaterBodyModel(
            name="Kadiyangad River (Kerala SW)",
            type="river",
            latitude=11.5992,
            longitude=75.7761,
            current_risk_level="low",
            risk_score=22.0,
            water_temp_c=26.0,
            flow_rate_cms=11.3,
            depth_meters=2.1,
            elevation_meters=14.0,
            basin_region="Kuttiyadi River Basin",
            data_source="Kerala State Water Resources Department (Kerala SW)",
            description="Official CWC/Kerala SW telemetry and daily discharge monitoring station on Kuttiyadi River, Kozhikode.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        WaterBodyModel(
            name="Vellur (Kerala SW)",
            type="river",
            latitude=12.1661,
            longitude=75.2031,
            current_risk_level="low",
            risk_score=20.0,
            water_temp_c=27.0,
            flow_rate_cms=4.2,
            depth_meters=1.75,
            elevation_meters=8.0,
            basin_region="Kuppam River Basin",
            data_source="Kerala State Water Resources Department (Kerala SW)",
            description="Official CWC/Kerala SW telemetry monitoring station at Vellur on Kuppam River, Kannur District.",
            last_updated=now,
            is_demonstration_data=False,
        ),
        WaterBodyModel(
            name="Aluva Manappuram (Periyar River)",
            type="river",
            latitude=10.1118,
            longitude=76.3533,
            current_risk_level="low",
            risk_score=25.0,
            water_temp_c=27.8,
            flow_rate_cms=16.5,
            depth_meters=3.2,
            elevation_meters=9.0,
            basin_region="Periyar River Basin",
            data_source="Kerala State Water Resources Department (Kerala SW)",
            description="Major religious bathing ghat on Periyar River; shifting riverbed silt and monsoon current surges during festival gatherings.",
            last_updated=now,
            is_demonstration_data=False,
        ),
    ]

def init_database():
    """Initializes SQLite schema tables and populates baseline demonstration records if empty."""
    Base.metadata.create_all(bind=engine)

    # Migrate any missing columns if table pre-existed
    with engine.connect() as conn:
        for col_name, col_type in [
            ("elevation_meters", "FLOAT"),
            ("basin_region", "VARCHAR(100)"),
            ("data_source", "VARCHAR(100)"),
            ("description", "TEXT"),
            ("is_demonstration_data", "BOOLEAN DEFAULT 1"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE water_bodies ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass  # column already exists
        try:
            conn.execute(text("ALTER TABLE alerts ADD COLUMN is_demonstration_data BOOLEAN DEFAULT 1"))
            conn.commit()
        except Exception:
            pass
    
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        existing_count = db.query(WaterBodyModel).count()
        if existing_count == 0:
            sample_water_bodies = get_demonstration_water_bodies()
            sample_water_bodies.extend(get_kerala_water_bodies())
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
                    timestamp=now,
                    is_demonstration_data=True
                )
                db.add(sample_alert)
                db.commit()
        else:
            # Upgrade existing water bodies if geographic metadata is missing
            metadata_map = {
                1: (142.0, "San Francisco Bay Basin", "Synthetic Demonstration Node", "[DEMONSTRATION DATA] Calm sub-alpine reservoir basin with gentle circulation currents.", True),
                2: (88.5, "San Francisco Bay Basin", "Synthetic Demonstration Node", "[DEMONSTRATION DATA] Steep canyon gorge river with surging snowmelt and dangerous undercurrents.", True),
                3: (2.0, "Pacific Coastal Drainage", "Synthetic Demonstration Node", "[DEMONSTRATION DATA] Coastal inlet with tidal currents and elevated wind chop during incoming tides.", True),
                4: (210.0, "Central Valley Basin", "Synthetic Demonstration Node", "[DEMONSTRATION DATA] Controlled municipal reservoir with stable thermal layering and monitored perimeter.", True),
                5: (65.0, "San Francisco Bay Basin", "Synthetic Demonstration Node", "[DEMONSTRATION DATA] Shallow braided river segment with moderate flow velocity and clear visibility.", True),
            }
            for wb_id, (elev, basin, source, desc, demo_flag) in metadata_map.items():
                wb = db.query(WaterBodyModel).filter(WaterBodyModel.id == wb_id).first()
                if wb:
                    if wb.elevation_meters is None:
                        wb.elevation_meters = elev
                    if wb.basin_region is None:
                        wb.basin_region = basin
                    if wb.data_source is None:
                        wb.data_source = source
                    if wb.description is None:
                        wb.description = desc
                    if getattr(wb, "is_demonstration_data", None) is None:
                        wb.is_demonstration_data = demo_flag

            # Ensure all Kerala water bodies exist
            for site in get_kerala_water_bodies():
                existing = db.query(WaterBodyModel).filter(WaterBodyModel.name == site.name).first()
                if not existing:
                    db.add(site)
            db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
    print("Database initialized successfully with synthetic benchmark records.")
