from pydantic import BaseModel, Field


class AddressCreate(BaseModel):
    session_id: str

    full_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=10, max_length=20)

    address_line1: str = Field(min_length=3, max_length=255)
    address_line2: str | None = None

    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)

    postal_code: str = Field(min_length=4, max_length=20)

    country: str = "India"
    is_default: bool = False


class AddressResponse(BaseModel):
    id: int
    full_name: str
    phone: str
    address_line1: str
    address_line2: str | None
    city: str
    state: str
    postal_code: str
    country: str
    is_default: bool

    model_config = {
        "from_attributes": True
    }