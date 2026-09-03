from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.dependencies import get_db
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.schemas.product import ProductResponse, VariantResponse

router = APIRouter(
    prefix="/api/products",
    tags=["Products"],
)


@router.get("/", response_model=list[ProductResponse])
def search_products(
    category: str | None = None,
    max_price: Decimal | None = Query(default=None, gt=0),
    search: str | None = None,
    color: str | None = None,
    size: str | None = None,
    db: Session = Depends(get_db),
):
    query = (
        select(Product)
        .options(
            selectinload(Product.variants)
            .selectinload(ProductVariant.inventory)
        )
        .where(Product.is_active.is_(True))
    )

    if category:
        query = query.where(
            Product.category.ilike(f"%{category}%")
        )

    if search:
        search_filter = f"%{search}%"

        query = query.where(
            or_(
                Product.name.ilike(search_filter),
                Product.description.ilike(search_filter),
                Product.brand.ilike(search_filter),
            )
        )

    if color or size or max_price is not None:
        query = query.join(Product.variants)

        if color:
            query = query.where(
                ProductVariant.color.ilike(f"%{color}%")
            )

        if size:
            query = query.where(
                ProductVariant.size.ilike(f"%{size}%")
            )

        if max_price is not None:
            query = query.where(
                ProductVariant.price <= max_price
            )

    query = query.distinct()

    products = db.scalars(query).unique().all()

    return products


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = db.scalar(
        select(Product)
        .options(
            selectinload(Product.variants)
            .selectinload(ProductVariant.inventory)
        )
        .where(
            Product.id == product_id,
            Product.is_active.is_(True),
        )
    )

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    return product


@router.get(
    "/{product_id}/variants",
    response_model=list[VariantResponse],
)
def get_product_variants(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = db.scalar(
        select(Product).where(
            Product.id == product_id,
            Product.is_active.is_(True),
        )
    )

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    variants = db.scalars(
        select(ProductVariant)
        .options(
            selectinload(ProductVariant.inventory)
        )
        .where(
            ProductVariant.product_id == product_id
        )
    ).all()

    return variants