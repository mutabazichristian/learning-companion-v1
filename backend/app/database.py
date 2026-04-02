import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

# Locate .env in the backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_DB = os.getenv("MYSQL_DB", "learning_companion")

DATABASE_URL = (
    f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    username = Column(String(50), primary_key=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Document(Base):
    __tablename__ = "documents"
    doc_id = Column(String(8), primary_key=True)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    owner = Column(String(50), ForeignKey("users.username"))
    total_pages = Column(Integer, default=0)
    concepts = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class Session(Base):
    __tablename__ = "sessions"
    token = Column(String(255), primary_key=True)
    username = Column(String(50), ForeignKey("users.username"))
    created_at = Column(DateTime, default=datetime.utcnow)


class StudentProgress(Base):
    __tablename__ = "student_progress"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), ForeignKey("users.username"), nullable=False)
    doc_id = Column(String(8), ForeignKey("documents.doc_id"), nullable=False)
    concept = Column(String(255), nullable=False)
    status = Column(String(20), default="untested")
    difficulty = Column(Integer, default=1)
    score = Column(Integer, default=0)
    times_asked = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Analytics(Base):
    __tablename__ = "class_analytics"
    id = Column(Integer, primary_key=True, autoincrement=True)
    doc_id = Column(String(8), ForeignKey("documents.doc_id"))
    concept = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False)
    difficulty = Column(Integer, default=1)
    timestamp = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
