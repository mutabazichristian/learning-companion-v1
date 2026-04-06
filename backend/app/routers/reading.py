import os
import uuid
from typing import List, Optional

from app.database import StudentProgress, get_db
from app.schemas.reading import (
    AskQuestionRequest,
    AskQuestionResponse,
    SourceChunk,
    UploadPDFResponse,
)
from app.services import (
    analytics_service,
    auth_service,
    chroma_service,
    document_service,
    question_service,
)
from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session


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


router = APIRouter(prefix="/reading", tags=["reading"])


@router.post("/upload-pdf", response_model=UploadPDFResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload PDFs")

    doc_id = str(uuid.uuid4())[:8]

    suffix = os.path.splitext(file.filename)[1] or ".pdf"
    save_path = os.path.join(document_service.UPLOADS_DIR, f"{doc_id}{suffix}")
    with open(save_path, "wb") as f:
        f.write(await file.read())

    result = chroma_service.ingest_pdf(save_path, doc_id)
    document_service.add_document(
        db=db,
        doc_id=doc_id,
        filename=file.filename,
        owner=user["username"],
        title=file.filename,
        total_pages=result.get("total_pages", 0),
        concepts=result.get("concepts", {}),
    )

    return UploadPDFResponse(**result)


@router.post("/ask-question", response_model=AskQuestionResponse)
async def ask_question(request: AskQuestionRequest, db: Session = Depends(get_db)):
    doc_id = request.doc_id
    concept = request.concept
    student_answer = request.student_answer
    difficulty_level = request.difficulty_level

    source_chunks_data = chroma_service.query_collection(doc_id, concept, num_results=3)

    source_chunks = [
        SourceChunk(
            page_number=chunk["page_number"],
            text=chunk["text"],
            chunk_index=chunk["chunk_index"],
        )
        for chunk in source_chunks_data
    ]

    if not student_answer:
        is_synthesis = False
        if request.conversation_history and len(request.conversation_history) > 4:
            is_synthesis = True

        source_text = " ".join([c.text for c in source_chunks])

        if is_synthesis:
            question = question_service.generate_question(concept, 4, source_text)
        else:
            question = question_service.generate_question(
                concept, difficulty_level, source_text
            )

        return AskQuestionResponse(
            question=question,
            evaluation=None,
            feedback="",
            source_chunks=source_chunks,
            next_difficulty=difficulty_level,
            scaffold_question="",
        )

    else:
        source_text = " ".join([c.text for c in source_chunks])
        eval_result = question_service.evaluate_answer(
            student_answer, concept, source_text, difficulty_level
        )

        evaluation = eval_result.get("evaluation", "partially_correct")
        next_diff = eval_result.get("next_difficulty", difficulty_level)
        scaffold_q = eval_result.get("scaffold_question", "")

        if evaluation == "correct":
            next_diff = min(3, next_diff)
        elif evaluation == "partially_correct":
            if not scaffold_q:
                scaffold_q = question_service.generate_followup_question(
                    concept, student_answer, difficulty_level, source_text
                )
            next_diff = difficulty_level
        else:
            next_diff = max(1, difficulty_level - 1)
            if not scaffold_q:
                scaffold_q = question_service.generate_followup_question(
                    concept, student_answer, next_diff, source_text
                )

        status_map = {
            "correct": "mastered",
            "partially_correct": "partial",
            "incorrect": "struggling",
        }
        analytics_service.track_mastery_event(
            db=db,
            doc_id=doc_id,
            concept=concept,
            status=status_map.get(evaluation, "partial"),
            difficulty=next_diff,
        )

        return AskQuestionResponse(
            question="",
            evaluation=evaluation,
            feedback=eval_result.get("feedback", ""),
            source_chunks=source_chunks,
            next_difficulty=next_diff,
            scaffold_question=scaffold_q,
        )


class SaveProgressRequest(BaseModel):
    doc_id: str
    concept: str
    status: str
    difficulty: int
    score: int
    times_asked: int


@router.get("/progress/{doc_id}")
async def get_progress(
    doc_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    progress = (
        db.query(StudentProgress)
        .filter(
            StudentProgress.username == user["username"],
            StudentProgress.doc_id == doc_id,
        )
        .all()
    )
    return {
        p.concept: {
            "status": p.status,
            "difficulty": p.difficulty,
            "score": p.score,
            "timesAsked": p.times_asked,
        }
        for p in progress
    }


@router.post("/progress")
async def save_progress(
    req: SaveProgressRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    progress = (
        db.query(StudentProgress)
        .filter(
            StudentProgress.username == user["username"],
            StudentProgress.doc_id == req.doc_id,
            StudentProgress.concept == req.concept,
        )
        .first()
    )

    if progress:
        progress.status = req.status
        progress.difficulty = req.difficulty
        progress.score = req.score
        progress.times_asked = req.times_asked
    else:
        progress = StudentProgress(
            username=user["username"],
            doc_id=req.doc_id,
            concept=req.concept,
            status=req.status,
            difficulty=req.difficulty,
            score=req.score,
            times_asked=req.times_asked,
        )
        db.add(progress)

    db.commit()
    return {"message": "progress saved"}
