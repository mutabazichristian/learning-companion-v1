import os
import uuid
from typing import Optional

from database import get_db
from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from pydantic import BaseModel
from services import analytics_service, auth_service, chroma_service, document_service
from sqlalchemy.orm import Session

router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentResponse(BaseModel):
    doc_id: str
    title: str
    filename: str
    owner: str
    created_at: str
    total_pages: int
    concepts: dict
    url: str


def get_current_user(
    authorization: Optional[str] = Header(None), db: Session = Depends(get_db)
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header"
        )
    token = authorization.split(" ", 1)[1].strip()
    user = auth_service.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: str = "",
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] != "teacher":
        raise HTTPException(
            status_code=403, detail="Only teacher users can upload documents"
        )

    doc_id = str(uuid.uuid4())[:8]
    suffix = os.path.splitext(file.filename)[1].lower() or ".pdf"
    temp_file_path = os.path.join(document_service.UPLOADS_DIR, f"{doc_id}{suffix}")

    try:
        with open(temp_file_path, "wb") as f:
            f.write(await file.read())
    except Exception:
        raise HTTPException(status_code=500, detail="File saving failed")

    try:
        ingest = chroma_service.ingest_pdf(temp_file_path, doc_id)
    except Exception:
        raise HTTPException(status_code=500, detail="Processing failed")

    try:
        doc = document_service.add_document(
            db=db,
            doc_id=doc_id,
            filename=file.filename,
            owner=user["username"],
            title=title or file.filename,
            total_pages=ingest.get("total_pages", 0),
            concepts=ingest.get("concepts", {}),
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Saving failed")

    return doc


@router.get("/list")
async def list_documents(user=Depends(get_current_user), db: Session = Depends(get_db)):
    docs = document_service.list_documents(db)
    if user["role"] == "teacher":
        docs = [d for d in docs if d.get("owner") == user["username"]]
    return docs


@router.get("/{doc_id}")
async def get_document(
    doc_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    doc = document_service.get_document(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if user["role"] == "teacher" and doc.get("owner") != user["username"]:
        raise HTTPException(status_code=403, detail="Not your document")
    return doc


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    doc = document_service.get_document(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if user["role"] != "teacher" or doc.get("owner") != user["username"]:
        raise HTTPException(status_code=403, detail="Only owner teacher can delete")

    ok = document_service.delete_document(db, doc_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete document")
    return {"message": "deleted"}


@router.put("/{doc_id}")
async def update_document(
    doc_id: str,
    title: Optional[str] = None,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = document_service.get_document(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if user["role"] != "teacher" or doc.get("owner") != user["username"]:
        raise HTTPException(status_code=403, detail="Only owner teacher can update")

    out = document_service.update_document(db, doc_id, title=title)
    if not out:
        raise HTTPException(status_code=500, detail="Failed to update document")
    return out


@router.get("/{doc_id}/analytics")
async def get_doc_analytics(
    doc_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    doc = document_service.get_document(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if user["role"] != "teacher" or doc.get("owner") != user["username"]:
        raise HTTPException(
            status_code=403, detail="Only the document owner can view analytics"
        )

    return analytics_service.get_document_heatmap(db, doc_id)
