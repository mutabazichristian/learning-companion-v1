import os
from typing import Dict, List, Optional

from app.database import Document
from sqlalchemy.orm import Session

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")

os.makedirs(UPLOADS_DIR, exist_ok=True)


def list_documents(db: Session) -> List[Dict]:
    docs = db.query(Document).all()
    return [
        {
            "doc_id": d.doc_id,
            "filename": d.filename,
            "title": d.title,
            "owner": d.owner,
            "created_at": d.created_at.isoformat() + "Z",
            "total_pages": d.total_pages,
            "concepts": d.concepts,
            "url": f"/uploads/{d.doc_id}.pdf",
        }
        for d in docs
    ]


def get_document(db: Session, doc_id: str) -> Optional[Dict]:
    d = db.query(Document).filter(Document.doc_id == doc_id).first()
    if not d:
        return None
    return {
        "doc_id": d.doc_id,
        "filename": d.filename,
        "title": d.title,
        "owner": d.owner,
        "created_at": d.created_at.isoformat() + "Z",
        "total_pages": d.total_pages,
        "concepts": d.concepts,
        "url": f"/uploads/{d.doc_id}.pdf",
    }


def add_document(
    db: Session,
    doc_id: str,
    filename: str,
    owner: str,
    title: Optional[str],
    total_pages: int,
    concepts: Dict,
) -> Dict:
    new_doc = Document(
        doc_id=doc_id,
        filename=filename,
        title=title or filename,
        owner=owner,
        total_pages=total_pages,
        concepts=concepts,
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return {
        "doc_id": new_doc.doc_id,
        "filename": new_doc.filename,
        "title": new_doc.title,
        "owner": new_doc.owner,
        "created_at": new_doc.created_at.isoformat() + "Z",
        "total_pages": new_doc.total_pages,
        "concepts": new_doc.concepts,
        "url": f"/uploads/{new_doc.doc_id}.pdf",
    }


def update_document(
    db: Session, doc_id: str, title: Optional[str] = None
) -> Optional[Dict]:
    doc = db.query(Document).filter(Document.doc_id == doc_id).first()
    if not doc:
        return None
    if title is not None:
        doc.title = title
    db.commit()
    db.refresh(doc)
    return {
        "doc_id": doc.doc_id,
        "title": doc.title,
    }


def delete_document(db: Session, doc_id: str) -> bool:
    doc = db.query(Document).filter(Document.doc_id == doc_id).first()
    if not doc:
        return False

    db.delete(doc)
    db.commit()

    file_path = os.path.join(UPLOADS_DIR, f"{doc_id}.pdf")
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        pass
    return True
