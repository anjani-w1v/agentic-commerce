from decimal import Decimal

from app.models.product_variant import ProductVariant
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.dependencies import get_db
from app.models.address import Address
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.schemas.order import (
    CreateOrderRequest,
    OrderResponse,
)

router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"],
)

@router.get(
    "/{order_id}",
    response_model=OrderResponse,
)
def get_order(
    order_id: int,
    session_id: str,
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order)
        .options(
            selectinload(Order.items)
        )
        .where(
            Order.id == order_id,
            Order.session_id == session_id,
        )
    )

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    return order

@router.post(
    "/checkout",
    response_model=OrderResponse,
)
def create_order(
    request: CreateOrderRequest,
    db: Session = Depends(get_db),
):
    # 1. Get cart
    cart = db.scalar(
        select(Cart)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product),

            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.inventory),
        )
        .where(
            Cart.session_id == request.session_id
        )
    )

    if cart is None or not cart.items:
        raise HTTPException(
            status_code=400,
            detail="Cart is empty",
        )

    # 2. Get address
    address = db.scalar(
        select(Address).where(
            Address.id == request.address_id,
            Address.session_id == request.session_id,
        )
    )

    if address is None:
        raise HTTPException(
            status_code=404,
            detail="Address not found",
        )

    # 3. Validate every cart item
    subtotal = Decimal("0.00")

    for item in cart.items:
        inventory = item.variant.inventory

        available_stock = 0

        if inventory:
            available_stock = (
                inventory.quantity
                - inventory.reserved_quantity
            )

        if item.quantity > available_stock:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Insufficient stock for "
                    f"{item.variant.sku}. "
                    f"Available: {available_stock}"
                ),
            )

        # Re-check current price
        if item.unit_price != item.variant.price:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Price changed for "
                    f"{item.variant.sku}. "
                    "Please review your cart."
                ),
            )

        subtotal += (
            item.unit_price * item.quantity
        )

    # 4. Create order
    order = Order(
        session_id=request.session_id,
        status="pending_payment",
        subtotal=subtotal,
        currency="INR",
        address_id=address.id,

        shipping_name=address.full_name,
        shipping_phone=address.phone,
        shipping_address_line1=address.address_line1,
        shipping_address_line2=address.address_line2,
        shipping_city=address.city,
        shipping_state=address.state,
        shipping_postal_code=address.postal_code,
        shipping_country=address.country,
    )

    db.add(order)
    db.flush()

    # 5. Create immutable order-item snapshots
    for item in cart.items:
        order_item = OrderItem(
            order_id=order.id,
            variant_id=item.variant_id,

            product_name=item.variant.product.name,
            sku=item.variant.sku,
            color=item.variant.color,
            size=item.variant.size,

            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=(
                item.unit_price * item.quantity
            ),
        )

        db.add(order_item)

    db.commit()

    # 6. Reload complete order
    order = db.scalar(
        select(Order)
        .options(
            selectinload(Order.items)
        )
        .where(Order.id == order.id)
    )

    return order