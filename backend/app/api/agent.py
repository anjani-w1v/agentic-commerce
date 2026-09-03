from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.schemas.agent import (
    AgentChatRequest,
    AgentChatResponse,
)
from app.services.agent_service import chat_with_agent


router = APIRouter(
    prefix="/api/agent",
    tags=["Agent"],
)


@router.post(
    "/chat",
    response_model=AgentChatResponse,
)
def agent_chat(
    request: AgentChatRequest,
    db: Session = Depends(get_db),
):
    message, products, intent = chat_with_agent(
        message=request.message,
        db=db,
        session_id=request.session_id,
    )

    return AgentChatResponse(
        message=message,
        products=products,
        intent=intent,
    )