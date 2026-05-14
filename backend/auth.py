"""
FIDELITY BEHAVIORAL ENGINE — JWT Authentication
Handles token generation and verification for admin endpoints.
"""

import logging
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import get_settings

logger = logging.getLogger("fidelity.auth")
settings = get_settings()
security = HTTPBearer()


def create_access_token(username: str, role: str = "admin") -> str:
    """Generate a signed JWT with expiration."""
    payload = {
        "sub": username,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    logger.info(f"[AUTH] Token issued for user: {username}")
    return token


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI dependency: extracts and verifies the Bearer token.
    Returns the decoded payload or raises 401.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("[AUTH] Token expired.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please re-authenticate.",
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"[AUTH] Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )


def verify_admin(payload: dict = Depends(verify_token)) -> dict:
    """
    Stricter dependency: ensures the token belongs to an admin role.
    """
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required.",
        )
    return payload
