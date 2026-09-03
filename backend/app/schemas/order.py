from decimal import Decimal

from pydantic import BaseModel


class CreateOrderRequest(BaseModel):
    session_id: str
    address_id: int


class OrderItemResponse(BaseModel):
    id: int
    variant_id: int
    product_name: str
    sku: str
    color: str | None
    size: str | None
    quantity: int
    unit_price: Decimal
    total_price: Decimal


class OrderResponse(BaseModel):
    id: int
    session_id: str
    status: str
    subtotal: Decimal
    currency: str

    shipping_name: str
    shipping_phone: str
    shipping_address_line1: str
    shipping_address_line2: str | None
    shipping_city: str
    shipping_state: str
    shipping_postal_code: str
    shipping_country: str

    items: list[OrderItemResponse]

    model_config = {
        "from_attributes": True
    }