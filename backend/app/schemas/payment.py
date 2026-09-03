from pydantic import BaseModel


class CreatePaymentRequest(BaseModel):
    session_id: str
    order_id: int


class PaymentOrderResponse(BaseModel):
    order_id: int
    razorpay_order_id: str
    amount: int
    currency: str
    razorpay_key_id: str


class VerifyPaymentRequest(BaseModel):
    session_id: str
    order_id: int

    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerificationResponse(BaseModel):
    order_id: int
    status: str
    payment_status: str
    razorpay_payment_id: str | None