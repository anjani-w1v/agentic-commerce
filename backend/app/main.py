from fastapi import FastAPI

from app.api.products import router as products_router
from app.api.cart import router as cart_router
from app.api.address import router as address_router
from app.api.orders import router as orders_router
from app.api.payments import router as payments_router
from fastapi.middleware.cors import CORSMiddleware
from app.api.agent import router as agent_router
from app.api.audit import router as audit_router


app = FastAPI(
    title="Agentic Commerce API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router)
app.include_router(cart_router)
app.include_router(address_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(audit_router)
app.include_router(agent_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "agentic-commerce-api",
    }