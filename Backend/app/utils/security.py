import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from app.config import settings
from app.models.auth import UserRole

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

ROLE_PERMISSIONS: Dict[UserRole, List[str]] = {
    UserRole.VIEWER: [
        "view:dashboards",
        "view:pulse",
        "export:csv",
        "export:pdf",
    ],
    UserRole.EXPLORER: [
        "view:dashboards",
        "view:pulse",
        "export:csv",
        "export:pdf",
        "explore:datasets",
        "ai:analyst",
        "ai:detective",
    ],
    UserRole.ANALYST: [
        "view:dashboards",
        "view:pulse",
        "export:csv",
        "export:pdf",
        "explore:datasets",
        "ai:analyst",
        "ai:detective",
        "create:datasets",
        "create:dashboards",
        "edit:dashboards",
        "delete:dashboards",
        "ai:generate_dashboard",
    ],
    UserRole.PUBLISHER: [
        "view:dashboards",
        "view:pulse",
        "export:csv",
        "export:pdf",
        "explore:datasets",
        "ai:analyst",
        "ai:detective",
        "create:datasets",
        "create:dashboards",
        "edit:dashboards",
        "delete:dashboards",
        "ai:generate_dashboard",
        "publish:dashboards",
        "schedule:reports",
        "manage:shares",
    ],
    UserRole.ADMIN: [
        "*",  # Full superuser access
        "view:dashboards",
        "view:pulse",
        "export:csv",
        "export:pdf",
        "explore:datasets",
        "ai:analyst",
        "ai:detective",
        "create:datasets",
        "create:dashboards",
        "edit:dashboards",
        "delete:dashboards",
        "ai:generate_dashboard",
        "publish:dashboards",
        "schedule:reports",
        "manage:shares",
        "manage:users",
        "manage:workspaces",
        "view:audit_logs",
    ],
}

def get_role_permissions(role: UserRole) -> List[str]:
    return ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS[UserRole.VIEWER])
