from fastapi import APIRouter

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/create-session")
async def create_session():
    return {"message": "you're trying to create a session"}
