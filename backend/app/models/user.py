"""
AQUORA AI - User & Authentication Model
Track: Enterprise Security, RBAC & Authority Access Control

Persists user identities, cryptographic salts, role-based access control roles
(ADMIN, OFFICER, INSPECTOR, VIEWER), organization affiliation, and activity audits.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime
try:
    from app.db.session import Base
except ImportError:
    from backend.app.db.session import Base


class UserModel(Base):
    """
    Persisted user account with role-based access control permissions.
    """
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    salt = Column(String(64), nullable=False)
    role = Column(String(50), nullable=False, default="VIEWER", index=True)  # ADMIN, OFFICER, INSPECTOR, VIEWER
    organization = Column(String(200), nullable=True, default="Kerala Water Authority")
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_login = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "full_name": self.full_name,
            "role": self.role,
            "organization": self.organization,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }

