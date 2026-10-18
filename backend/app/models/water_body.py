from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
try:
    from app.db.session import Base
except ImportError:
    from backend.app.db.session import Base

class WaterBodyModel(Base):
    __tablename__ = "water_bodies"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(120), nullable=False, index=True)
    type = Column(String(50), nullable=False) # lake, river, reservoir, coastal
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    current_risk_level = Column(String(30), default="low") # low, moderate, high, extreme
    risk_score = Column(Float, default=15.0)
    water_temp_c = Column(Float, default=19.0)
    flow_rate_cms = Column(Float, default=1.0)
    depth_meters = Column(Float, default=4.0)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    description = Column(String(255), nullable=True)
    is_demonstration_data = Column(Boolean, default=True, nullable=False)
