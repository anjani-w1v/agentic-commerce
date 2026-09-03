from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class VariantResponse(BaseModel):
    id: int
    sku: str
    price: Decimal
    currency: str
    color: str | None
    size: str | None
    stock: int

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: int
    merchant_id: int
    name: str
    description: str | None
    category: str
    brand: str | None
    image_url: str | None
    rating: float | None
    is_active: bool

    variants: list[VariantResponse]

    model_config = ConfigDict(from_attributes=True)