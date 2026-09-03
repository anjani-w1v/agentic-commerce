from decimal import Decimal

from pydantic import BaseModel


class AddToCartRequest(BaseModel):
    session_id: str
    variant_id: int
    quantity: int = 1


class UpdateCartItemRequest(BaseModel):
    session_id: str
    quantity: int


class CartItemResponse(BaseModel):
    id: int
    variant_id: int
    product_name: str
    color: str | None
    size: str | None
    sku: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal


class CartResponse(BaseModel):
    id: int
    session_id: str
    items: list[CartItemResponse]
    subtotal: Decimal