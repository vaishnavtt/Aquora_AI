from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.session import Base

class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    water_body_id = Column(Integer, ForeignKey("water_bodies.id"), nullable=True)
    water_body_name = Column(String(120), nullable=False)
    severity = Column(String(30), default="moderate") # low, moderate, high, extreme
    message = Column(String(255), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
