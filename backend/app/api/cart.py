from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.dependencies import get_db
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.schemas.cart import (
    AddToCartRequest,
    CartItemResponse,
    CartResponse,
    UpdateCartItemRequest,
)

router = APIRouter(
    prefix="/api/cart",
    tags=["Cart"],
)


def get_or_create_cart(
    session_id: str,
    db: Session,
) -> Cart:
    cart = db.scalar(
        select(Cart)
        .where(Cart.session_id == session_id)
    )

    if cart is None:
        cart = Cart(session_id=session_id)
        db.add(cart)
        db.flush()

    return cart


def build_cart_response(cart: Cart) -> CartResponse:
    items = []

    subtotal = Decimal("0.00")

    for item in cart.items:
        total_price = item.unit_price * item.quantity
        subtotal += total_price

        items.append(
            CartItemResponse(
                id=item.id,
                variant_id=item.variant_id,
                product_name=item.variant.product.name,
                color=item.variant.color,
                size=item.variant.size,
                sku=item.variant.sku,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=total_price,
            )
        )

    return CartResponse(
        id=cart.id,
        session_id=cart.session_id,
        items=items,
        subtotal=subtotal,
    )


@router.post("/items", response_model=CartResponse)
def add_to_cart(
    request: AddToCartRequest,
    db: Session = Depends(get_db),
):
    if request.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero",
        )

    variant = db.scalar(
        select(ProductVariant)
        .options(
            selectinload(ProductVariant.product),
            selectinload(ProductVariant.inventory),
        )
        .where(ProductVariant.id == request.variant_id)
    )

    if variant is None:
        raise HTTPException(
            status_code=404,
            detail="Product variant not found",
        )

    available_stock = 0

    if variant.inventory:
        available_stock = (
            variant.inventory.quantity
            - variant.inventory.reserved_quantity
        )

    cart = get_or_create_cart(
        request.session_id,
        db,
    )

    existing_item = db.scalar(
        select(CartItem)
        .where(
            CartItem.cart_id == cart.id,
            CartItem.variant_id == variant.id,
        )
    )

    current_quantity = (
        existing_item.quantity
        if existing_item
        else 0
    )

    new_quantity = current_quantity + request.quantity

    if new_quantity > available_stock:
        raise HTTPException(
            status_code=409,
            detail=f"Only {available_stock} units available",
        )

    if existing_item:
        existing_item.quantity = new_quantity
    else:
        item = CartItem(
            cart_id=cart.id,
            variant_id=variant.id,
            quantity=request.quantity,
            unit_price=variant.price,
        )

        db.add(item)

    db.commit()

    cart = db.scalar(
        select(Cart)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product)
        )
        .where(Cart.id == cart.id)
    )

    return build_cart_response(cart)


@router.get("/{session_id}", response_model=CartResponse)
def get_cart(
    session_id: str,
    db: Session = Depends(get_db),
):
    cart = db.scalar(
        select(Cart)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product)
        )
        .where(Cart.session_id == session_id)
    )

    if cart is None:
        cart = Cart(session_id=session_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)

    return build_cart_response(cart)


@router.patch("/items/{item_id}", response_model=CartResponse)
def update_cart_item(
    item_id: int,
    request: UpdateCartItemRequest,
    db: Session = Depends(get_db),
):
    if request.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero",
        )

    item = db.scalar(
        select(CartItem)
        .options(
            selectinload(CartItem.variant)
            .selectinload(ProductVariant.inventory),
            selectinload(CartItem.variant)
            .selectinload(ProductVariant.product),
        )
        .join(Cart)
        .where(
            CartItem.id == item_id,
            Cart.session_id == request.session_id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Cart item not found",
        )

    inventory = item.variant.inventory

    available_stock = 0

    if inventory:
        available_stock = (
            inventory.quantity
            - inventory.reserved_quantity
        )

    if request.quantity > available_stock:
        raise HTTPException(
            status_code=409,
            detail=f"Only {available_stock} units available",
        )

    item.quantity = request.quantity

    db.commit()

    cart = db.scalar(
        select(Cart)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product)
        )
        .where(
            Cart.session_id == request.session_id
        )
    )

    return build_cart_response(cart)


@router.delete("/items/{item_id}", response_model=CartResponse)
def remove_cart_item(
    item_id: int,
    session_id: str,
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(CartItem)
        .join(Cart)
        .where(
            CartItem.id == item_id,
            Cart.session_id == session_id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Cart item not found",
        )

    cart_id = item.cart_id

    db.delete(item)
    db.commit()

    cart = db.scalar(
        select(Cart)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product)
        )
        .where(Cart.id == cart_id)
    )

    return build_cart_response(cart)


@router.delete("/{session_id}", response_model=CartResponse)
def clear_cart(
    session_id: str,
    db: Session = Depends(get_db),
):
    cart = db.scalar(
        select(Cart)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product)
        )
        .where(Cart.session_id == session_id)
    )

    if cart is None:
        raise HTTPException(
            status_code=404,
            detail="Cart not found",
        )

    cart.items.clear()

    db.commit()

    return build_cart_response(cart)