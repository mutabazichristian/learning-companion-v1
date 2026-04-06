import hashlib
import uuid
from typing import Dict, Optional

from app.database import Session as UserSession
from app.database import User
from sqlalchemy.orm import Session


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


def register_user(db: Session, username: str, password: str, role: str) -> bool:
    if role not in ["teacher", "student"]:
        return False

    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        return False

    new_user = User(username=username, password_hash=hash_password(password), role=role)
    db.add(new_user)
    db.commit()
    return True


def authenticate_user(db: Session, username: str, password: str) -> Optional[Dict]:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None

    if verify_password(password, user.password_hash):
        return {"username": user.username, "role": user.role}
    return None


def create_session(db: Session, username: str) -> str:
    token = str(uuid.uuid4())
    new_session = UserSession(token=token, username=username)
    db.add(new_session)
    db.commit()
    return token


def get_user_by_token(db: Session, token: str) -> Optional[Dict]:
    session_entry = db.query(UserSession).filter(UserSession.token == token).first()
    if not session_entry:
        return None

    user = db.query(User).filter(User.username == session_entry.username).first()
    if not user:
        return None

    return {"username": user.username, "role": user.role}


def delete_session(db: Session, token: str) -> None:
    session_entry = db.query(UserSession).filter(UserSession.token == token).first()
    if session_entry:
        db.delete(session_entry)
        db.commit()
