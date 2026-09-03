from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.audit_log import AuditLog

router = APIRouter(
    prefix="/api/audit",
    tags=["Audit"],
)


@router.get("/{session_id}")
def get_audit_logs(
    session_id: str,
    db: Session = Depends(get_db),
):
    logs = db.scalars(
        select(AuditLog)
        .where(
            AuditLog.session_id == session_id
        )
        .order_by(
            AuditLog.created_at.desc()
        )
    ).all()

    return [
        {
            "id": log.id,
            "session_id": log.session_id,
            "action": log.action,
            "details": log.details,
            "order_id": log.order_id,
            "created_at": log.created_at,
        }
        for log in logs
    ]
