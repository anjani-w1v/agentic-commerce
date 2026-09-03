from decimal import Decimal

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.product import Product
from app.models.product_variant import ProductVariant


def search_catalog(
    db: Session,
    search_terms: list[str],
    max_price: Decimal | None = None,
    limit: int = 10,
):
    query = (
        select(Product)
        .options(
            selectinload(Product.variants)
            .selectinload(ProductVariant.inventory)
        )
        .where(Product.is_active.is_(True))
    )

    if search_terms:
        conditions = []

        for term in search_terms:
            pattern = f"%{term}%"

            conditions.extend(
                [
                    Product.name.ilike(pattern),
                    Product.description.ilike(pattern),
                    Product.brand.ilike(pattern),
                    Product.category.ilike(pattern),
                ]
            )

        query = query.where(or_(*conditions))

    if max_price is not None:
        query = (
            query.join(Product.variants)
            .where(ProductVariant.price <= max_price)
        )

    query = query.distinct().limit(limit)

    products = db.scalars(query).unique().all()

    return products