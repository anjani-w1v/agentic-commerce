from fastapi import FastAPI


from app.api.products import router as products_router
from app.api.cart import router as cart_router
from app.api.address import router as address_router
from app.api.orders import router as orders_router
from app.api.payments import router as payments_router
from fastapi.middleware.cors import CORSMiddleware
from app.api.agent import router as agent_router
from app.api.audit import router as audit_router
from app.api.campaigns import router as campaigns_router
from app.db.database import engine
from app.db.base import Base
from app.db.seed import seed


app = FastAPI(
    title="Agentic Commerce API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "https://agentic-commerce-three.vercel.app",
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
app.include_router(campaigns_router)
app.include_router(agent_router)

    
@app.on_event("startup")
def initialize_database():
    Base.metadata.create_all(bind=engine)
    seed()


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "agentic-commerce-api",
    }