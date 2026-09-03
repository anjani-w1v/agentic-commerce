from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(primary_key=True)

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    sku: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="INR",
        nullable=False,
    )

    color: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    size: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    product = relationship(
        "Product",
        back_populates="variants",
    )

    inventory = relationship(
        "Inventory",
        back_populates="variant",
        uselist=False,
        cascade="all, delete-orphan",
    )

    @property
    def stock(self) -> int:
        if self.inventory is None:
            return 0

        return max(
            0,
            self.inventory.quantity - self.inventory.reserved_quantity,
        )