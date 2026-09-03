from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)

    session_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="pending_payment",
        nullable=False,
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="INR",
        nullable=False,
    )

    address_id: Mapped[int] = mapped_column(
        ForeignKey("addresses.id"),
        nullable=False,
    )

    # Address snapshot
    shipping_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    shipping_phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    shipping_address_line1: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    shipping_address_line2: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    shipping_city: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    shipping_state: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    shipping_postal_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    shipping_country: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # Razorpay payment fields
    razorpay_order_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
    )

    razorpay_payment_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
    )

    payment_status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )