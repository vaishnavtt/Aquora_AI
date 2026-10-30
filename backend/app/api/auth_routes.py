"""
AQUORA AI - Authentication & Role-Based Access Control Routes
Track: Enterprise Security, RBAC & Authority Access Control

Endpoints:
- POST /api/v1/auth/login        : Authenticate credentials, issue tamper-proof signed JWT
- GET  /api/v1/auth/me           : Return authenticated profile and active privileges
- POST /api/v1/auth/logout       : Invalidate client session
- POST /api/v1/auth/register     : Administrator endpoint to register official personnel
- POST /api/v1/auth/change-pwd   : Update account password with salt rotation
- GET  /api/v1/auth/roles        : Documented roles and operational authorization matrix
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

try:
    from app.core.config import settings
    from app.core.security import (
        generate_salt,
        hash_password,
        verify_password,
        create_access_token,
        decode_access_token,
    )
    from app.db.session import get_db
    from app.models.user import UserModel
    from app.schemas.auth import (
        UserRole,
        UserResponse,
        LoginRequest,
        TokenResponse,
        UserCreateRequest,
        UserUpdateRequest,
        PasswordChangeRequest,
    )
except ImportError:
    from backend.app.core.config import settings
    from backend.app.core.security import (
        generate_salt,
        hash_password,
        verify_password,
        create_access_token,
        decode_access_token,
    )
    from backend.app.db.session import get_db
    from backend.app.models.user import UserModel
    from backend.app.schemas.auth import (
        UserRole,
        UserResponse,
        LoginRequest,
        TokenResponse,
        UserCreateRequest,
        UserUpdateRequest,
        PasswordChangeRequest,
    )

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

http_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> UserModel:
    """
    Validates the bearer token and returns the authenticated user model.
    Raises HTTP 401 if token is absent, invalid, or expired.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials are required. Provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    claims = decode_access_token(token)
    if not claims or "sub" not in claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, tampered, or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = int(claims["sub"])
    user = db.query(UserModel).filter(UserModel.id == user_id, UserModel.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> Optional[UserModel]:
    """
    Extracts current user if valid credentials are provided; returns None otherwise without error.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        claims = decode_access_token(credentials.credentials)
        if not claims or "sub" not in claims:
            return None
        user_id = int(claims["sub"])
        return db.query(UserModel).filter(UserModel.id == user_id, UserModel.is_active == True).first()
    except Exception:
        return None


def require_roles(allowed_roles: List[str]):
    """
    Dependency factory that enforces role membership.
    Supported roles: ADMIN, OFFICER, INSPECTOR, VIEWER.
    """
    def role_checker(current_user: UserModel = Depends(get_current_user)) -> UserModel:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role in {allowed_roles}; your role is '{current_user.role}'.",
            )
        return current_user
    return role_checker


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login & Token Issuance",
    description="Authenticates official credentials and returns a tamper-proof signed bearer token.",
)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Verifies username/email and password against PBKDF2 hash with unique salt.
    """
    user = db.query(UserModel).filter(
        (UserModel.username == req.username) | (UserModel.email == req.username)
    ).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(req.password, user.salt, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    token_payload = {
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "organization": user.organization,
    }
    access_token = create_access_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Authenticated User Profile",
    description="Returns the profile and role privileges of the currently signed-in user.",
)
def get_current_user_profile(current_user: UserModel = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="User Logout",
    description="Terminates client authorization session.",
)
def logout(current_user: Optional[UserModel] = Depends(get_optional_current_user)):
    return {"status": "success", "message": "Session terminated successfully."}


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register New Personnel Account (Admin / Officer Only)",
    description="Registers an official staff user with cryptographically generated salt and role.",
)
def register_user(
    req: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["ADMIN", "OFFICER"])),
):
    """
    Registers an official user account. Only administrators and senior disaster management officers can provision new users.
    """
    # Check if username or email already exists
    existing = db.query(UserModel).filter(
        (UserModel.username == req.username) | (UserModel.email == req.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with that username or email address already exists.",
        )

    salt = generate_salt()
    hashed = hash_password(req.password, salt)

    new_user = UserModel(
        email=req.email,
        username=req.username,
        full_name=req.full_name,
        hashed_password=hashed,
        salt=salt,
        role=req.role.value if hasattr(req.role, "value") else str(req.role),
        organization=req.organization,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse.model_validate(new_user)


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change Account Password",
    description="Allows authenticated personnel to update their password with a newly regenerated cryptographic salt.",
)
def change_password(
    req: PasswordChangeRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(req.current_password, current_user.salt, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed.",
        )

    new_salt = generate_salt()
    new_hash = hash_password(req.new_password, new_salt)
    current_user.salt = new_salt
    current_user.hashed_password = new_hash
    db.commit()

    return {"status": "success", "message": "Password updated successfully with new salt."}


@router.get(
    "/roles",
    status_code=status.HTTP_200_OK,
    summary="Role-Based Access Control Matrix",
    description="Returns the defined roles and their authorized capability matrix in AQUORA AI.",
)
def get_rbac_matrix():
    return {
        "roles": [
            {
                "role": "ADMIN",
                "label": "System Administrator",
                "description": "Full access: user provisioning, data import/export, system health monitoring, alert dispatch, and model diagnostics.",
                "permissions": ["users:manage", "data:import", "data:export", "alerts:dispatch", "inspections:manage", "diagnostics:view"],
            },
            {
                "role": "OFFICER",
                "label": "Disaster Management Officer (KSDMA)",
                "description": "Operational authority: dispatch alerts, schedule inspections, generate official reports, simulate what-if scenarios.",
                "permissions": ["alerts:dispatch", "inspections:manage", "reports:generate", "simulations:run", "data:export"],
            },
            {
                "role": "INSPECTOR",
                "label": "Field Safety Inspector (KWA)",
                "description": "Field authority: view prioritized sites, update inspection checklists, log structural hazards.",
                "permissions": ["inspections:view", "inspections:update", "reports:view"],
            },
            {
                "role": "VIEWER",
                "label": "Public Observer / Stakeholder",
                "description": "Read-only access: view dashboard, water body telemetry, forecasts, and GIS map.",
                "permissions": ["dashboard:view", "telemetry:view", "map:view"],
            },
        ]
    }

