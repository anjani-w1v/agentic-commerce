import razorpay

from app.core.config import settings


client = razorpay.Client(
    auth=(
        settings.razorpay_key_id,
        settings.razorpay_key_secret,
    )
)


def create_razorpay_order(
    amount: int,
    currency: str = "INR",
    receipt: str | None = None,
):
    data = {
        "amount": amount,
        "currency": currency,
    }

    if receipt:
        data["receipt"] = receipt

    return client.order.create(data=data)


def verify_payment_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
):
    return client.utility.verify_payment_signature(
        {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
        }
    )