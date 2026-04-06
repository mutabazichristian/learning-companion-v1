from typing import Optional

from app.database import get_db
from app.services.auth_service import (
    authenticate_user,
    create_session,
    get_user_by_token,
    register_user,
)
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    success = register_user(db, req.username.strip(), req.password, req.role.lower())
    if not success:
        raise HTTPException(
            status_code=400, detail="Username already exists or invalid role"
        )
    return {"message": "User registered"}


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, req.username.strip(), req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_session(db, user["username"])
    return AuthResponse(
        access_token=token, username=user["username"], role=user["role"]
    )


def get_current_user(
    authorization: Optional[str] = Header(None), db: Session = Depends(get_db)
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header"
        )
    token = authorization.split(" ", 1)[1].strip()
    user = get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user
