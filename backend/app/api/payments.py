from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.order import Order
from app.models.audit_log import AuditLog
from app.schemas.payment import (
    CreatePaymentRequest,
    PaymentOrderResponse,
    PaymentVerificationResponse,
    VerifyPaymentRequest,
)
from app.services.razorpay_service import (
    create_razorpay_order,
    verify_payment_signature,
)
from app.core.config import settings


router = APIRouter(
    prefix="/api/payments",
    tags=["Payments"],
)

# Track 01 safety boundary:
# AI/backend may never create a payment above this amount.
MAX_AGENT_PAYMENT_INR = 100000


@router.post(
    "/create-order",
    response_model=PaymentOrderResponse,
)
def create_payment_order(
    request: CreatePaymentRequest,
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order).where(
            Order.id == request.order_id,
            Order.session_id == request.session_id,
        )
    )

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if order.status != "pending_payment":
        raise HTTPException(
            status_code=400,
            detail="Order is not awaiting payment",
        )

    amount_rupees = float(order.subtotal)

    # BOUNDED MONEY ACTION
    if amount_rupees <= 0:
        db.add(
            AuditLog(
                session_id=request.session_id,
                action="PAYMENT_BLOCKED",
                details=(
                    f"Payment blocked for Order #{order.id}: "
                    "invalid amount"
                ),
                order_id=order.id,
            )
        )
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than zero",
        )

    if amount_rupees > MAX_AGENT_PAYMENT_INR:
        db.add(
            AuditLog(
                session_id=request.session_id,
                action="PAYMENT_BLOCKED",
                details=(
                    f"Payment blocked for Order #{order.id}: "
                    f"₹{amount_rupees:.2f} exceeds the "
                    f"₹{MAX_AGENT_PAYMENT_INR:.2f} safety limit"
                ),
                order_id=order.id,
            )
        )
        db.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                "Payment exceeds the AgentCart safety limit of "
                f"₹{MAX_AGENT_PAYMENT_INR:,.0f}"
            ),
        )

    amount = int(order.subtotal * 100)

    try:
        razorpay_order = create_razorpay_order(
            amount=amount,
            currency=order.currency,
            receipt=f"agentcart_order_{order.id}",
        )
    except Exception as exc:
        db.add(
            AuditLog(
                session_id=request.session_id,
                action="PAYMENT_CREATION_FAILED",
                details=(
                    f"Razorpay payment creation failed for "
                    f"Order #{order.id}: {str(exc)[:500]}"
                ),
                order_id=order.id,
            )
        )
        db.commit()

        raise HTTPException(
            status_code=502,
            detail=(
                "Payment could not be started. "
                "Your order is safe and has not been charged. "
                "Please retry."
            ),
        )

    order.razorpay_order_id = razorpay_order["id"]
    order.payment_status = "created"

    db.add(
        AuditLog(
            session_id=request.session_id,
            action="PAYMENT_CREATED",
            details=(
                f"Payment created for Order #{order.id}: "
                f"₹{amount_rupees:.2f} INR. "
                f"Safety limit: ₹{MAX_AGENT_PAYMENT_INR:,.0f}."
            ),
            order_id=order.id,
        )
    )

    db.commit()

    return PaymentOrderResponse(
        order_id=order.id,
        razorpay_order_id=razorpay_order["id"],
        amount=amount,
        currency=order.currency,
        razorpay_key_id=settings.razorpay_key_id,
    )


@router.post(
    "/verify",
    response_model=PaymentVerificationResponse,
)
def verify_payment(
    request: VerifyPaymentRequest,
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order).where(
            Order.id == request.order_id,
            Order.session_id == request.session_id,
        )
    )

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if order.razorpay_order_id != request.razorpay_order_id:
        raise HTTPException(
            status_code=400,
            detail="Razorpay order mismatch",
        )

    try:
        verify_payment_signature(
            razorpay_order_id=request.razorpay_order_id,
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_signature=request.razorpay_signature,
        )
    except Exception:
        db.add(
            AuditLog(
                session_id=request.session_id,
                action="PAYMENT_VERIFICATION_FAILED",
                details=(
                    f"Payment verification failed for "
                    f"Order #{order.id}. "
                    "Order was not marked as paid."
                ),
                order_id=order.id,
            )
        )
        db.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                "Payment verification failed. "
                "Your order was not marked as paid. "
                "You can safely retry payment."
            ),
        )

    order.razorpay_payment_id = (
        request.razorpay_payment_id
    )

    order.payment_status = "paid"
    order.status = "paid"

    db.add(
        AuditLog(
            session_id=request.session_id,
            action="PAYMENT_VERIFIED",
            details=(
                f"Payment verified successfully for "
                f"Order #{order.id}."
            ),
            order_id=order.id,
        )
    )

    db.commit()

    return PaymentVerificationResponse(
        order_id=order.id,
        status=order.status,
        payment_status=order.payment_status,
        razorpay_payment_id=order.razorpay_payment_id,
    )