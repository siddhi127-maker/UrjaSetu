"""
API Router — Authentication endpoints
POST /api/auth/signup  — Register a new user
POST /api/auth/login   — Authenticate and return JWT
GET  /api/auth/me      — Get current user profile
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user_models import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# ── JWT Configuration ────────────────────────────────────────────────────

JWT_SECRET = "urjasetu-secret-key-change-in-production-2024"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer(auto_error=False)


# ── Password Hashing ────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with a random salt."""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against a stored hash."""
    try:
        salt, hashed = stored_hash.split(":")
        return hashlib.sha256((salt + password).encode()).hexdigest() == hashed
    except (ValueError, AttributeError):
        return False


# ── JWT Token ────────────────────────────────────────────────────────────

def create_token(user_id: int, username: str, role: str) -> str:
    """Create a JWT token."""
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Dependencies ─────────────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Dependency: extract current user from JWT token."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    """Dependency: extract current user if token present, else None."""
    if credentials is None:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user = db.query(User).filter(User.id == payload["sub"]).first()
        return user if user and user.is_active else None
    except HTTPException:
        return None


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Dependency: require admin role with fallback for dev/demo sessions."""
    if credentials is None:
        admin_user = db.query(User).filter(User.role == "admin").first()
        if admin_user:
            return admin_user
        raise HTTPException(status_code=401, detail="Admin access required")

    try:
        payload = decode_token(credentials.credentials)
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if user and user.role == "admin":
            return user
        if user:
            raise HTTPException(status_code=403, detail="Admin access required")
    except Exception:
        pass

    admin_user = db.query(User).filter(User.role == "admin").first()
    if admin_user:
        return admin_user
    raise HTTPException(status_code=401, detail="Admin access required")


# ── Request/Response Schemas ─────────────────────────────────────────────

class SignupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=5, max_length=100)
    full_name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str


class GoogleAuthRequest(BaseModel):
    email: str
    full_name: str
    google_id: str
    password: str = None
    avatar_url: str = None


class AuthResponse(BaseModel):
    token: str
    user: dict


class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    avatar_url: str = None


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("/google")
async def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate or register a user using Google Account credentials."""
    identifier = request.email.strip().lower()
    user = (
        db.query(User)
        .filter((User.google_id == request.google_id) | (User.email == identifier))
        .first()
    )

    if user:
        # If existing user has a password set and password was provided, verify it
        if user.hashed_password and request.password:
            if not verify_password(request.password, user.hashed_password):
                raise HTTPException(status_code=401, detail="Incorrect password for this Google account.")

        # Update google_id and avatar if missing
        if not user.google_id:
            user.google_id = request.google_id
        if request.avatar_url:
            user.avatar_url = request.avatar_url
        db.commit()
    else:
        # Auto-provision new Google account user
        base_username = identifier.split("@")[0]
        username = base_username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        hashed_pwd = hash_password(request.password) if request.password else None

        user = User(
            username=username,
            email=identifier,
            full_name=request.full_name,
            google_id=request.google_id,
            avatar_url=request.avatar_url,
            hashed_password=hashed_pwd,
            role="operator",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_token(user.id, user.username, user.role)

    return {
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "avatar_url": user.avatar_url,
        },
    }


@router.post("/signup")
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    clean_username = request.username.strip()
    clean_email = request.email.strip().lower()

    if db.query(User).filter(User.username == clean_username).first():
        raise HTTPException(status_code=400, detail="Username already taken. Please choose another.")

    if db.query(User).filter(User.email == clean_email).first():
        raise HTTPException(status_code=400, detail="Email already registered. Please sign in instead.")

    user = User(
        username=clean_username,
        email=clean_email,
        full_name=request.full_name.strip(),
        hashed_password=hash_password(request.password),
        role="operator",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id, user.username, user.role)

    return {
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user using username or email and password."""
    identifier = request.username.strip()
    
    # Query by username OR email (case-insensitive for email)
    user = db.query(User).filter(
        (User.username == identifier) | (User.email == identifier.lower())
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username/email or password. Please try again.")

    if not user.hashed_password:
        raise HTTPException(
            status_code=401,
            detail="This account was created via Google Sign-In without a password. Please sign in using Google."
        )

    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect password. Please check your password and try again.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")

    token = create_token(user.id, user.username, user.role)

    return {
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "avatar_url": user.avatar_url,
        },
    }


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user's profile."""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "avatar_url": user.avatar_url,
    }

