from datetime import datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Inventory(Base):
    __tablename__ = "inventory"

    id: Mapped[int] = mapped_column(primary_key=True)

    variant_id: Mapped[int] = mapped_column(
        ForeignKey("product_variants.id"),
        unique=True,
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )

    reserved_quantity: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    variant = relationship(
        "ProductVariant",
        back_populates="inventory",
    )