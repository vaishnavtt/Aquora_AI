from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
try:
    from app.db.session import Base
except ImportError:
    from backend.app.db.session import Base

class AlertModel(Base):
    __tablename__ = "alerts"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    water_body_id = Column(Integer, ForeignKey("water_bodies.id"), nullable=True)
    water_body_name = Column(String(120), nullable=False)
    severity = Column(String(30), default="moderate") # low, moderate, high, extreme
    message = Column(String(255), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_demonstration_data = Column(Boolean, default=True, nullable=False)
