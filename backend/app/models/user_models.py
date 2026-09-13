"""
User model for authentication and role-based access control.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    """User account for authentication and access control."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(256), nullable=True)  # Nullable for Google OAuth users
    google_id = Column(String(100), unique=True, nullable=True, index=True)
    avatar_url = Column(String(255), nullable=True)

    # Role: "operator" (default) or "admin"
    role = Column(String(20), default="operator", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, server_default=func.now())

