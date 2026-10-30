"""
AQUORA AI - Authentication & Role-Based Access Control Schemas
Track: Enterprise Security, RBAC & Authority Access Control
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    OFFICER = "OFFICER"
    INSPECTOR = "INSPECTOR"
    VIEWER = "VIEWER"


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    organization: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or email address")
    password: str = Field(..., min_length=1, description="Account password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user: UserResponse


class UserCreateRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="Valid corporate or departmental email")
    username: str = Field(..., min_length=3, max_length=50, description="Unique username identifier")
    full_name: str = Field(..., min_length=2, max_length=150, description="Full name of staff member")
    password: str = Field(..., min_length=8, max_length=128, description="Cryptographically robust password")
    role: UserRole = Field(default=UserRole.VIEWER, description="Role-based access level")
    organization: Optional[str] = Field(default="Kerala Water Authority", description="Department or agency affiliation")


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    organization: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

