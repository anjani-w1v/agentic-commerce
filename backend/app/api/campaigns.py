import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.audit_log import AuditLog
from app.schemas.campaign import (
    CampaignExecuteRequest,
    CampaignExecuteResponse,
)

router = APIRouter(
    prefix="/api/campaigns",
    tags=["Campaigns"],
)

MAX_DISCOUNT_PERCENT = 10.0


@router.post(
    "/execute",
    response_model=CampaignExecuteResponse,
)
def execute_campaign(
    request: CampaignExecuteRequest,
    db: Session = Depends(get_db),
):
    if not request.target.strip():
        raise HTTPException(
            status_code=400,
            detail="Campaign target is required.",
        )

    # Explicit merchant confirmation gate
    if not request.confirmed:
        log = AuditLog(
            session_id=request.session_id,
            action="CAMPAIGN_CONFIRMATION_REQUIRED",
            details=(
                "Campaign execution was blocked because "
                "explicit merchant confirmation was not provided."
            ),
        )
        db.add(log)
        db.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                "Campaign execution requires explicit merchant "
                "confirmation."
            ),
        )

    # Bounded action guardrail
    if request.discount_percent > MAX_DISCOUNT_PERCENT:
        log = AuditLog(
            session_id=request.session_id,
            action="CAMPAIGN_BLOCKED",
            details=(
                f"Requested discount "
                f"{request.discount_percent:.2f}% exceeds "
                f"maximum allowed discount "
                f"{MAX_DISCOUNT_PERCENT:.2f}%."
            ),
        )
        db.add(log)
        db.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                f"Campaign blocked. Maximum allowed "
                f"discount is {MAX_DISCOUNT_PERCENT:.0f}%."
            ),
        )

    campaign_id = f"camp_{uuid.uuid4().hex[:10]}"

    # Sandbox execution:
    # No customer payment is charged.
    # No product price is modified.
    log = AuditLog(
        session_id=request.session_id,
        action="CAMPAIGN_EXECUTED",
        details=(
            f"Sandbox campaign {campaign_id} executed. "
            f"Type: {request.campaign_type}. "
            f"Target: {request.target}. "
            f"Discount: {request.discount_percent:.2f}%. "
            f"Bound: <= {MAX_DISCOUNT_PERCENT:.0f}%. "
            f"Merchant confirmed: True."
        ),
    )

    db.add(log)
    db.commit()

    return CampaignExecuteResponse(
        status="executed_sandbox",
        campaign_id=campaign_id,
        target=request.target,
        campaign_type=request.campaign_type,
        discount_percent=request.discount_percent,
        message=(
            "Campaign executed in sandbox mode. "
            "No customer payment or product price was changed."
        ),
    )
