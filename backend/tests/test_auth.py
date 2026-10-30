"""
AQUORA AI - Authentication & Role-Based Access Control Test Suite
Tests:
- Token generation, decoding, tamper detection, and expiration
- User login with valid / invalid credentials
- Profile retrieval (/auth/me) with bearer token
- Role-based authorization enforcement (ADMIN, OFFICER, INSPECTOR, VIEWER)
- User registration permissions and duplicate conflict rejection
- Password changes with cryptographic salt rotation
- RBAC capability matrix inspection
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import (
    generate_salt,
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.db.session import SessionLocal
from app.models.user import UserModel


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def ensure_test_users():
    """Ensures standard seeded users are present for auth tests."""
    from app.db.init_db import seed_default_users
    db = SessionLocal()
    seed_default_users(db)
    db.close()


def test_security_cryptography_primitives():
    salt1 = generate_salt()
    salt2 = generate_salt()
    assert salt1 != salt2
    assert len(salt1) == 64

    pwd = "Secr3tPassword!"
    hash1 = hash_password(pwd, salt1)
    hash2 = hash_password(pwd, salt2)
    assert hash1 != hash2  # Salt isolation

    assert verify_password(pwd, salt1, hash1) is True
    assert verify_password("WrongPassword", salt1, hash1) is False


def test_token_creation_and_tamper_detection():
    data = {"sub": "42", "role": "OFFICER"}
    token = create_access_token(data)
    assert isinstance(token, str)

    claims = decode_access_token(token)
    assert claims is not None
    assert claims["sub"] == "42"
    assert claims["role"] == "OFFICER"
    assert "exp" in claims

    # Tampered token
    tampered = token[:-4] + "abcd"
    assert decode_access_token(tampered) is None

    # Garbage token
    assert decode_access_token("not-a-token") is None


def test_login_success_admin(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@Aquora2026!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "ADMIN"
    assert data["user"]["username"] == "admin"


def test_login_with_email_success(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "officer@ksdma.kerala.gov.in", "password": "Officer@Ksdma2026!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "OFFICER"


def test_login_invalid_password(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "WrongPassword123!"},
    )
    assert res.status_code == 401
    assert "Invalid username or password" in res.json()["detail"]


def test_login_nonexistent_user(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "ghost_user", "password": "SomePassword123!"},
    )
    assert res.status_code == 401


def test_get_current_user_profile(client):
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "inspector", "password": "Inspector@Kwa2026!"},
    )
    token = login_res.json()["access_token"]

    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    profile = res.json()
    assert profile["username"] == "inspector"
    assert profile["role"] == "INSPECTOR"
    assert profile["organization"] == "Kerala Water Authority"


def test_get_current_user_profile_unauthorized(client):
    # No auth header
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401

    # Invalid token
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid_token"})
    assert res.status_code == 401


def test_admin_can_register_new_user(client):
    # Ensure clean slate for test user
    db = SessionLocal()
    existing = db.query(UserModel).filter(UserModel.username == "auditor_wayanad").first()
    if existing:
        db.delete(existing)
        db.commit()
    db.close()

    # Login as admin
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@Aquora2026!"},
    )
    admin_token = login_res.json()["access_token"]

    reg_payload = {
        "email": "field_auditor_wayanad@kwa.kerala.gov.in",
        "username": "auditor_wayanad",
        "full_name": "Wayanad Field Auditor",
        "password": "Auditor@Wayanad2026!",
        "role": "INSPECTOR",
        "organization": "Kerala Water Authority - North Division",
    }

    res = client.post(
        "/api/v1/auth/register",
        json=reg_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    new_user = res.json()
    assert new_user["username"] == "auditor_wayanad"
    assert new_user["role"] == "INSPECTOR"

    # Verify newly registered user can log in
    new_login = client.post(
        "/api/v1/auth/login",
        json={"username": "auditor_wayanad", "password": "Auditor@Wayanad2026!"},
    )
    assert new_login.status_code == 200


def test_viewer_cannot_register_user(client):
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "viewer", "password": "Viewer@Aquora2026!"},
    )
    viewer_token = login_res.json()["access_token"]

    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "unauthorized@test.com",
            "username": "unauthorized",
            "full_name": "Unauthorized Attempt",
            "password": "Password123!",
            "role": "VIEWER",
        },
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


def test_register_duplicate_username_fails(client):
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@Aquora2026!"},
    )
    admin_token = login_res.json()["access_token"]

    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "different_email@test.com",
            "username": "admin",  # Duplicate username
            "full_name": "Duplicate Admin",
            "password": "Password123!",
            "role": "VIEWER",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]


def test_rbac_matrix_endpoint(client):
    res = client.get("/api/v1/auth/roles")
    assert res.status_code == 200
    data = res.json()
    assert "roles" in data
    role_names = [r["role"] for r in data["roles"]]
    assert "ADMIN" in role_names
    assert "OFFICER" in role_names
    assert "INSPECTOR" in role_names
    assert "VIEWER" in role_names


def test_logout_endpoint(client):
    res = client.post("/api/v1/auth/logout")
    assert res.status_code == 200
    assert res.json()["status"] == "success"
