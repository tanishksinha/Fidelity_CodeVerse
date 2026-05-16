"""
auth.py — JWT Authentication for Fidelity Behavioral AI
Handles /api/auth/register and /api/auth/consumer-login
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from database import supabase

logger = logging.getLogger(__name__)

# --- CONFIG ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fidelity-hackathon-secret-2026")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str = None  # optional, but needed for WhatsApp


class LoginRequest(BaseModel):
    email: str
    password: str


def create_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload["exp"] = expire
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register")
async def register(req: RegisterRequest):
    """
    Creates a new user in Supabase users table.
    Hashes the password before storing.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Check if email already exists
    existing = supabase.table("users").select("id").eq("email", req.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash the password (bcrypt limit is 72 bytes)
    password_hash = pwd_context.hash(req.password[:72])

    # Insert into Supabase
    result = supabase.table("users").insert({
        "name": req.name,
        "email": req.email,
        "password_hash": password_hash,
        "phone": req.phone,
        "role": "USER"
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create account")

    logger.info(f"[AUTH] New user registered: {req.email}")
    return {"message": "Account created successfully. Please log in."}


@router.post("/consumer-login")
async def login(req: LoginRequest):
    """
    Validates email + password, returns a JWT token + user info.
    The frontend saves phone/email from this response to localStorage.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Fetch user from Supabase
    result = supabase.table("users").select("*").eq("email", req.email).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result.data[0]

    # Verify password (must match truncation used during registration)
    if not pwd_context.verify(req.password[:72], user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Update last_login timestamp
    supabase.table("users").update({"last_login": datetime.now(timezone.utc).isoformat()}).eq("id", user["id"]).execute()

    # Create JWT token
    token = create_token({
        "sub": str(user["id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "phone": user.get("phone", ""),
        "role": user.get("role", "USER")
    })

    logger.info(f"[AUTH] Login successful: {req.email}")
    return {
        "access_token": token,
        "token_type": "bearer",
        "email": user["email"],
        "name": user.get("name", ""),
        "phone": user.get("phone", ""),
        "role": user.get("role", "USER")
    }
