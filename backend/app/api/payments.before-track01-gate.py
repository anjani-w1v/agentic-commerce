from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.order import Order
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

    amount = int(order.subtotal * 100)

    try:
        razorpay_order = create_razorpay_order(
            amount=amount,
            currency=order.currency,
            receipt=f"agentcart_order_{order.id}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Razorpay order creation failed: {exc}",
        )

    order.razorpay_order_id = razorpay_order["id"]
    order.payment_status = "created"

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
        raise HTTPException(
            status_code=400,
            detail="Payment verification failed",
        )

    order.razorpay_payment_id = (
        request.razorpay_payment_id
    )

    order.payment_status = "paid"
    order.status = "paid"

    db.commit()

    return PaymentVerificationResponse(
        order_id=order.id,
        status=order.status,
        payment_status=order.payment_status,
        razorpay_payment_id=order.razorpay_payment_id,
    )