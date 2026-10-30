"""
AQUORA AI - Security, Cryptography & Token Utilities
Track: Enterprise Security, RBAC & Authority Access Control

Provides secure password hashing (PBKDF2-HMAC-SHA256 with 100,000 iterations and
unique per-user cryptographic salts) and tamper-proof HMAC-SHA256 signed access tokens.
"""

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

try:
    from app.core.config import settings
except ImportError:
    from backend.app.core.config import settings


def generate_salt() -> str:
    """Generates a cryptographically secure 32-byte random hex salt (64 characters)."""
    return secrets.token_hex(32)


def hash_password(password: str, salt: str) -> str:
    """
    Hashes a password with PBKDF2-HMAC-SHA256 using 100,000 iterations and salt.
    """
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    )
    return key.hex()


def verify_password(plain_password: str, salt: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against the stored salt and hash using constant-time comparison.
    """
    computed = hash_password(plain_password, salt)
    return hmac.compare_digest(computed, hashed_password)


def _b64_encode(data: bytes) -> str:
    """Encodes bytes to URL-safe base64 without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64_decode(data: str) -> bytes:
    """Decodes URL-safe base64 string with missing padding handled."""
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("ascii"))


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates an HMAC-SHA256 signed tamper-proof JWT token.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    })

    header = {"alg": "HS256", "typ": "JWT"}
    header_json = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_json = json.dumps(to_encode, separators=(",", ":")).encode("utf-8")

    encoded_header = _b64_encode(header_json)
    encoded_payload = _b64_encode(payload_json)

    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    encoded_signature = _b64_encode(signature)

    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and verifies an HMAC-SHA256 signed JWT token.
    Returns decoded claims if signature and expiry are valid; returns None otherwise.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        encoded_header, encoded_payload, encoded_signature = parts
        signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")

        # Verify signature
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()
        actual_sig = _b64_decode(encoded_signature)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        # Decode payload
        payload_bytes = _b64_decode(encoded_payload)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Verify expiration
        exp = payload.get("exp")
        if exp is not None:
            now_ts = int(datetime.now(timezone.utc).timestamp())
            if now_ts > exp:
                return None  # Token expired

        return payload
    except Exception:
        return None

