"""
Pydantic schemas for reading companion API.
"""
from pydantic import BaseModel
from typing import List, Dict, Optional, Any


class UploadPDFResponse(BaseModel):
    """Response from PDF upload endpoint."""
    doc_id: str
    total_pages: int
    concepts: Dict[int, List[str]]  # page_number -> [concept1, concept2, ...]


class AskQuestionRequest(BaseModel):
    """Request to /ask-question endpoint."""
    doc_id: str
    concept: str
    student_answer: Optional[str] = None
    difficulty_level: int = 1
    conversation_history: Optional[List[Dict[str, str]]] = None


class SourceChunk(BaseModel):
    """Citation information for response."""
    page_number: int
    text: str
    chunk_index: int


class AskQuestionResponse(BaseModel):
    """Response from /ask-question endpoint (metadata part)."""
    question: str
    evaluation: Optional[str] = None  # "correct" | "partially_correct" | "incorrect"
    feedback: str = ""
    source_chunks: List[SourceChunk]
    next_difficulty: int
    scaffold_question: str = ""


class ConceptStatus(BaseModel):
    """Status of a single concept."""
    status: str  # "untested" | "struggling" | "partial" | "mastered"
    attempts: int = 0
    difficulty_reached: int = 1


class ConceptMapType(BaseModel):
    """Full concept mastery map."""
    concepts: Dict[str, ConceptStatus]
