"""
Auth router — teacher login (password) and student access (code).
Issues JWT tokens with role claim.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError

from app.config import get_settings, Settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()


# ── Request / Response models ──

class LoginRequest(BaseModel):
    password: str
    role: str  # "teacher" or "student"


class TokenResponse(BaseModel):
    access_token: str
    role: str
    expires_in: int


# ── Token helpers ──

def _create_token(role: str, settings: Settings) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, settings: Settings) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── Dependency: extract current user role ──

async def get_current_role(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> str:
    payload = decode_token(credentials.credentials, settings)
    return payload.get("role", "student")


async def require_teacher(role: str = Depends(get_current_role)) -> str:
    if role != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return role


# ── Endpoints ──

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, settings: Settings = Depends(get_settings)):
    if req.role == "teacher":
        if req.password != settings.teacher_password:
            raise HTTPException(status_code=401, detail="Invalid teacher password")
    elif req.role == "student":
        if req.password != settings.student_access_code:
            raise HTTPException(status_code=401, detail="Invalid student access code")
    else:
        raise HTTPException(status_code=400, detail="Role must be 'teacher' or 'student'")

    token = _create_token(req.role, settings)
    return TokenResponse(
        access_token=token,
        role=req.role,
        expires_in=settings.jwt_expire_minutes * 60,
    )


@router.get("/me")
async def me(role: str = Depends(get_current_role)):
    return {"role": role}
