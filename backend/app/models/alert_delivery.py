from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
try:
    from app.db.session import Base
except ImportError:
    from backend.app.db.session import Base

class AlertDeliveryModel(Base):
    __tablename__ = "alert_deliveries"
    __table_args__ = {'extend_existing': True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id = Column(Integer, nullable=True)
    water_body_id = Column(Integer, nullable=True)
    water_body_name = Column(String(120), nullable=False)
    severity = Column(String(30), nullable=False)
    channel = Column(String(30), nullable=False) # "webhook", "email"
    recipient = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(30), nullable=False) # "DELIVERED", "FAILED", "TEST_MODE_SIMULATED", "UNCONFIGURED"
    confirmed_by_provider = Column(Boolean, default=False)
    provider_message = Column(Text, nullable=False)
    is_test_mode = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
