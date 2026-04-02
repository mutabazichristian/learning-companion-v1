from fastapi import APIRouter

router = APIRouter(prefix="/interactions", tags=["interactions"])


@router.post("/send-message")
async def send_message():
    return {"message": "you're sending an message for the ai"}
