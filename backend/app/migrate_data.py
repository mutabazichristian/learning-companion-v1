import json
import os
from pathlib import Path

from app.database import Analytics, Document, Session, SessionLocal, User, init_db

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"


def load_json(filename):
    path = DATA_DIR / filename
    if not path.exists():
        print(f"File not found: {path}")
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return {}


def migrate():
    print("Ensuring database tables exist...")
    init_db()
    db = SessionLocal()

    try:
        # 1. Migrate Users
        users_data = load_json("users.json")
        print(f"Found {len(users_data)} users to migrate.")
        for username, info in users_data.items():
            if not db.query(User).filter(User.username == username).first():
                user = User(
                    username=username, password_hash=info["password"], role=info["role"]
                )
                db.add(user)
        db.commit()
        print("Users migrated successfully.")

        # 2. Migrate Documents
        docs_data = load_json("documents.json")
        print(f"Found {len(docs_data)} documents to migrate.")
        for doc_id, info in docs_data.items():
            if not db.query(Document).filter(Document.doc_id == doc_id).first():
                doc = Document(
                    doc_id=doc_id,
                    title=info.get("title", info.get("filename", "Untitled")),
                    filename=info.get("filename", ""),
                    owner=info.get("owner"),
                    total_pages=info.get("total_pages", 0),
                    concepts=info.get("concepts", {}),
                )
                db.add(doc)
        db.commit()
        print("Documents migrated successfully.")

        # 3. Migrate Sessions (to fix your 'unauthorized' issue)
        sessions_data = load_json("sessions.json")
        print(f"Found {len(sessions_data)} sessions to migrate.")
        for token, info in sessions_data.items():
            if not db.query(Session).filter(Session.token == token).first():
                # Verify user exists in DB before adding session (foreign key constraint)
                if db.query(User).filter(User.username == info["username"]).first():
                    sess = Session(token=token, username=info["username"])
                    db.add(sess)
        db.commit()
        print("Sessions migrated successfully.")

        # 4. Migrate Analytics (aggregated JSON to event-based table)
        analytics_data = load_json("class_analytics.json")
        print(f"Migrating analytics summaries for {len(analytics_data)} documents...")
        for doc_id, concepts in analytics_data.items():
            # Check if doc exists in DB
            if not db.query(Document).filter(Document.doc_id == doc_id).first():
                continue

            for concept_name, stats in concepts.items():
                difficulty = int(stats.get("avg_difficulty", 1))
                # Create dummy events to preserve aggregate stats
                for _ in range(stats.get("mastered_count", 0)):
                    db.add(
                        Analytics(
                            doc_id=doc_id,
                            concept=concept_name,
                            status="mastered",
                            difficulty=difficulty,
                        )
                    )
                for _ in range(stats.get("partial_count", 0)):
                    db.add(
                        Analytics(
                            doc_id=doc_id,
                            concept=concept_name,
                            status="partial",
                            difficulty=difficulty,
                        )
                    )
                for _ in range(stats.get("struggling_count", 0)):
                    db.add(
                        Analytics(
                            doc_id=doc_id,
                            concept=concept_name,
                            status="struggling",
                            difficulty=difficulty,
                        )
                    )
        db.commit()
        print("Analytics data recreated in MySQL.")

        print("\nMigration successful! You should now be able to log in.")

    except Exception as e:
        db.rollback()
        print(f"\nMigration failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
