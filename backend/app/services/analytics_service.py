from typing import Any, Dict, List

from database import Analytics
from sqlalchemy import func
from sqlalchemy.orm import Session


def track_mastery_event(
    db: Session, doc_id: str, concept: str, status: str, difficulty: int
):
    new_event = Analytics(
        doc_id=doc_id, concept=concept, status=status, difficulty=difficulty
    )
    db.add(new_event)
    db.commit()


def get_document_heatmap(db: Session, doc_id: str) -> List[Dict[str, Any]]:
    # Aggregate stats directly from the database
    results = (
        db.query(
            Analytics.concept,
            func.count(Analytics.id).label("total"),
            func.sum(Analytics.status == "mastered").label("mastered"),
            func.sum(Analytics.status == "partial").label("partial"),
            func.sum(Analytics.status == "struggling").label("struggling"),
            func.avg(Analytics.difficulty).label("avg_diff"),
        )
        .filter(Analytics.doc_id == doc_id)
        .group_by(Analytics.concept)
        .all()
    )

    heatmap = []
    for r in results:
        total = r.total or 1
        heatmap.append(
            {
                "concept": r.concept,
                "mastery_rate": (r.mastered or 0) / total,
                "struggle_rate": (r.struggling or 0) / total,
                "total_students_engaged": total,
                "avg_difficulty": round(float(r.avg_diff or 1.0), 2),
                "status_summary": {
                    "mastered": int(r.mastered or 0),
                    "partial": int(r.partial or 0),
                    "struggling": int(r.struggling or 0),
                },
            }
        )

    return sorted(heatmap, key=lambda x: x["struggle_rate"], reverse=True)


def reset_document_analytics(db: Session, doc_id: str):
    db.query(Analytics).filter(Analytics.doc_id == doc_id).delete()
    db.commit()
