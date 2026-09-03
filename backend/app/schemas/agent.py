from pydantic import BaseModel


class AgentChatRequest(BaseModel):
    session_id: str
    message: str


class AgentProduct(BaseModel):
    product_id: int
    variant_id: int
    name: str
    brand: str | None
    category: str
    price: float
    currency: str
    image_url: str | None
    stock: int


class AgentChatResponse(BaseModel):
    message: str
    products: list[AgentProduct]
    intent: str = "search"


class AgentIntent(BaseModel):
    intent: str
    search_terms: list[str] = []
    category: str | None = None
    max_price: float | None = None
    quantity: int = 1
    product_name: str | None = None
    product_names: list[str] = []