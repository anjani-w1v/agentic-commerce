import json
import re
import uuid
from decimal import Decimal

from google import genai
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.order import Order
from app.models.audit_log import AuditLog
from app.schemas.agent import AgentProduct, AgentIntent
from app.services.product_search import search_catalog


# ============================================================
# CAMPAIGN ORCHESTRATOR
# ============================================================
#
# Track 01:
# Proposes bounded merchant campaigns from real store data.
#
# IMPORTANT:
# This function only proposes a campaign.
# It does NOT apply discounts or perform money actions.
# Merchant confirmation is required before execution.
# ============================================================

def get_revenue_recovery_proposal(
    db: Session,
    session_id: str,
):
    pending_orders = db.scalars(
        select(Order)
        .where(
            Order.session_id == session_id,
            Order.payment_status != "paid",
        )
        .order_by(Order.created_at.desc())
        .limit(20)
    ).all()

    if not pending_orders:
        return {
            "has_opportunity": False,
            "order_count": 0,
            "at_risk_value": 0.0,
            "action": "none",
            "reason": "No pending payments were found.",
            "bounded_action": (
                "No recovery action will be executed because "
                "there are no pending payments."
            ),
        }

    at_risk_value = sum(
        float(order.subtotal or 0)
        for order in pending_orders
    )

    max_recovery_value = 100000.0

    if at_risk_value > max_recovery_value:
        return {
            "has_opportunity": True,
            "order_count": len(pending_orders),
            "at_risk_value": at_risk_value,
            "action": "blocked",
            "reason": (
                f"Pending payment value exceeds the ₹{max_recovery_value:,.0f} "
                "recovery safety bound."
            ),
            "bounded_action": (
                f"Recovery is capped at ₹{max_recovery_value:,.0f}. "
                "Merchant confirmation is required."
            ),
        }

    return {
        "has_opportunity": True,
        "order_count": len(pending_orders),
        "at_risk_value": at_risk_value,
        "action": "secure_payment_retry",
        "reason": (
            "The safest recovery path is to guide customers back to "
            "a secure payment checkout and allow them to retry payment. "
            "No automatic customer charge should be attempted."
        ),
        "bounded_action": (
            "Bounded action: prepare a secure payment-retry recovery "
            "for these pending orders. Merchant confirmation is required; "
            "no customer is charged automatically."
        ),
    }


def execute_revenue_recovery_sandbox(
    db: Session,
    session_id: str,
    proposal: dict,
):
    recovery_id = f"recovery_{uuid.uuid4().hex[:10]}"

    log_agent_action(
        db=db,
        session_id=session_id,
        action="REVENUE_RECOVERY_EXECUTED",
        details=(
            f"Sandbox revenue recovery {recovery_id} executed. "
            f"Action: secure payment retry. "
            f"Orders: {proposal['order_count']}. "
            f"Revenue at risk: ₹{proposal['at_risk_value']:,.2f}. "
            f"Bound: <= ₹100,000. "
            f"Merchant confirmed: True. "
            f"No automatic customer charge."
        ),
    )

    return {
        "recovery_id": recovery_id,
        "message": (
            "Secure payment-retry recovery prepared in sandbox mode. "
            "No customer was charged automatically."
        ),
    }


def execute_campaign_sandbox(
    db: Session,
    session_id: str,
    proposal: dict,
):
    campaign_id = f"camp_{uuid.uuid4().hex[:10]}"

    log_agent_action(
        db=db,
        session_id=session_id,
        action="CAMPAIGN_EXECUTED",
        details=(
            f"Sandbox campaign {campaign_id} executed. "
            f"Type: {proposal['campaign_type']}. "
            f"Target: {proposal['target']}. "
            f"Discount: 10.00%. "
            f"Bound: <= 10%. "
            f"Merchant confirmed: True."
        ),
    )

    return {
        "campaign_id": campaign_id,
        "message": (
            "Campaign executed in sandbox mode. "
            "No customer payment or product price was changed."
        ),
    }


def get_campaign_proposal(
    db: Session,
    session_id: str,
):
    paid_orders = db.scalars(
        select(Order)
        .where(
            Order.payment_status == "paid"
        )
        .options(
            selectinload(Order.items)
        )
        .order_by(
            Order.created_at.desc()
        )
        .limit(50)
    ).all()

    if not paid_orders:
        proposal = {
            "campaign_type": "growth",
            "title": "Start with your best-selling products",
            "reason": "There is not enough paid-order history yet to identify a strong campaign target.",
            "offer": "No automatic discount proposed",
            "target": "Best-selling products",
            "bounded_action": "Merchant review required",
        }

        log_agent_action(
            db,
            session_id,
            "CAMPAIGN_PROPOSED",
            json.dumps(proposal),
        )

        return proposal

    product_sales: dict[int, int] = {}

    for order in paid_orders:
        for item in order.items:
            product_sales[item.variant_id] = (
                product_sales.get(item.variant_id, 0)
                + item.quantity
            )

    if not product_sales:
        proposal = {
            "campaign_type": "growth",
            "title": "Grow basket size",
            "reason": "Paid orders exist, but product-level sales data is not available for targeting.",
            "offer": "No automatic discount proposed",
            "target": "Existing customers",
            "bounded_action": "Merchant review required",
        }

        log_agent_action(
            db,
            session_id,
            "CAMPAIGN_PROPOSED",
            json.dumps(proposal),
        )

        return proposal

    best_variant_id = max(
        product_sales,
        key=product_sales.get,
    )

    variant = db.scalar(
        select(ProductVariant)
        .where(
            ProductVariant.id == best_variant_id
        )
        .options(
            selectinload(ProductVariant.product)
        )
    )

    if variant is None:
        proposal = {
            "campaign_type": "cross_sell",
            "title": "Increase basket size",
            "reason": "A strong-selling product was identified, but its product details could not be loaded.",
            "offer": "Up to 10% discount, merchant approval required",
            "target": "Customers buying popular products",
            "bounded_action": "No campaign will run automatically",
        }
    else:
        product = variant.product

        proposal = {
            "campaign_type": "cross_sell",
            "title": f"Increase sales around {product.name}",
            "reason": (
                f"{product.name} is currently the strongest product "
                f"signal from the latest {len(paid_orders)} paid order(s), "
                f"with {product_sales[best_variant_id]} unit(s) sold."
            ),
            "offer": "Bundle or complementary-product offer, capped at 10%",
            "target": product.name,
            "bounded_action": (
                "Proposal only — merchant confirmation is required "
                "before any campaign or discount is applied."
            ),
        }

    log_agent_action(
        db,
        session_id,
        "CAMPAIGN_PROPOSED",
        json.dumps(proposal),
    )

    return proposal


# ============================================================
# GEMINI CLIENT
# ============================================================

client = genai.Client(
    api_key=settings.gemini_api_key
)


# ============================================================
# SIMPLE CONVERSATION MEMORY
# ============================================================
#
# Stores lightweight context for the current session.
#
# Example:
# {
#   "demo-user-001": {
#       "last_products": [...],
#       "last_recommendation": "Pulse Wireless Headphones",
#       "last_intent": "recommend"
#   }
# }
#
# This is intentionally simple for the MVP.
# Database persistence can be added later.
# ============================================================

conversation_memory: dict[str, dict] = {}


def get_conversation_context(session_id: str) -> dict:
    return conversation_memory.get(
        session_id,
        {
            "last_products": [],
            "last_recommendation": None,
            "last_intent": None,
            "last_campaign_proposal": None,
            "last_recovery_proposal": None,
        },
    )


def save_conversation_context(
    session_id: str,
    products=None,
    recommendation=None,
    intent=None,
    campaign_proposal=None,
    recovery_proposal=None,
):
    current = conversation_memory.get(
        session_id,
        {
            "last_products": [],
            "last_recommendation": None,
            "last_intent": None,
            "last_campaign_proposal": None,
            "last_recovery_proposal": None,
        },
    )

    if products is not None:
        current["last_products"] = products

    if recommendation is not None:
        current["last_recommendation"] = recommendation
    elif recommendation is None and intent == "add_to_cart":
        current["last_recommendation"] = None

    if intent is not None:
        current["last_intent"] = intent

    if campaign_proposal is not None:
        current["last_campaign_proposal"] = campaign_proposal

    if recovery_proposal is not None:
        current["last_recovery_proposal"] = recovery_proposal

    conversation_memory[session_id] = current


# ============================================================
# EMPTY INTENT
# ============================================================

def empty_intent(intent: str = "search") -> AgentIntent:
    return AgentIntent(
        intent=intent,
        search_terms=[],
        category=None,
        max_price=None,
        quantity=1,
        product_name=None,
        product_names=[],
    )


# ============================================================
# PRODUCT -> AGENT PRODUCT
# ============================================================

def convert_to_agent_products(
    products: list[Product],
) -> list[AgentProduct]:

    results = []
    seen_product_ids = set()

    for product in products:

        if product.id in seen_product_ids:
            continue

        seen_product_ids.add(product.id)

        valid_variants = []

        for variant in product.variants:

            if not variant.inventory:
                continue

            if variant.inventory.quantity <= 0:
                continue

            valid_variants.append(variant)

        if not valid_variants:
            continue

        # Cheapest in-stock variant
        selected_variant = min(
            valid_variants,
            key=lambda v: Decimal(str(v.price)),
        )

        results.append(
            AgentProduct(
                product_id=product.id,
                variant_id=selected_variant.id,
                name=product.name,
                brand=product.brand,
                category=product.category,
                price=float(selected_variant.price),
                currency="INR",
                image_url=getattr(product, "image_url", None),
                stock=selected_variant.inventory.quantity,
            )
        )

    return results


# ============================================================
# FIND PRODUCT FROM MESSAGE
# ============================================================

def find_product_from_message(
    message: str,
    db: Session,
):
    message_lower = message.lower().strip()

    # ========================================================

    products = db.scalars(
        select(Product)
        .options(
            selectinload(Product.variants)
            .selectinload(ProductVariant.inventory)
        )
        .where(Product.is_active.is_(True))
    ).unique().all()

    # --------------------------------------------------------
    # Exact product name first
    # --------------------------------------------------------

    for product in products:

        product_name = product.name.lower()

        if product_name in message_lower:
            return product

    # --------------------------------------------------------
    # Brand
    # --------------------------------------------------------

    for product in products:

        if product.brand:

            if product.brand.lower() in message_lower:
                return product

    # --------------------------------------------------------
    # Category
    # --------------------------------------------------------

    for product in products:

        if product.category:

            if product.category.lower() in message_lower:
                return product

    return None


# ============================================================
# FALLBACK NLP
# ============================================================
#
# Used when Gemini is unavailable or misclassifies something.
# This is important for hackathon/demo reliability.
# ============================================================

def fallback_understand_request(
    message: str,
    db: Session,
) -> AgentIntent:

    text = message.lower().strip()

    # ========================================================
    # CASUAL CONVERSATION
    # ========================================================

    casual_phrases = {
        "hi",
        "hello",
        "hey",
        "hey there",
        "hii",
        "hiii",
        "good morning",
        "good afternoon",
        "good evening",
        "thanks",
        "thank you",
        "ok",
        "okay",
    }

    if text in casual_phrases:
        return empty_intent("conversation")

    # ========================================================
    # SHOW CART
    # ========================================================

    show_cart_phrases = [
        "show cart",
        "show my cart",
        "view cart",
        "my cart",
        "cart",
        "cart dikhao",
        "cart dikha do",
        "cart mein kya hai",
        "cart me kya hai",
        "what is in my cart",
        "what's in my cart",
    ]

    if any(phrase in text for phrase in show_cart_phrases):
        return empty_intent("show_cart")

    # ========================================================
    # CHECKOUT
    # ========================================================

    checkout_phrases = [
        "checkout",
        "check out",
        "buy now",
        "place order",
        "place the order",
        "order now",
        "pay now",
        "proceed to payment",
        "payment",
        "checkout karo",
        "order place karo",
        "order kar do",
    ]

    if any(phrase in text for phrase in checkout_phrases):
        return empty_intent("checkout")

    # ========================================================
    # RECOMMENDATION
    # ========================================================

    recommendation_phrases = [
        "what else should i buy",
        "what else can i buy",
        "what else should i get",
        "what else can i get",
        "anything else",
        "suggest something",
        "suggest me something",
        "recommend something",
        "recommend me something",
        "what do you recommend",
        "what should i buy",
        "what should i get",
        "what goes with this",
        "what goes well with this",
        "what can i pair with this",
        "aur kya",
        "aur kuch",
        "kuch aur",
        "kuch suggest karo",
        "kuch recommend karo",
        "aur kya le sakta hoon",
        "aur kya loon",
        "iske saath kya",
        "iske sath kya",
        "is ke saath kya",
        "saath mein kya",
        "saath me kya",
    ]

    if any(
        phrase in text
        for phrase in recommendation_phrases
    ):
        return empty_intent("recommend")

    # ========================================================
    # REMOVE FROM CART
    # ========================================================

    remove_patterns = [
        r"remove (.+)",
        r"delete (.+)",
        r"remove (.+) from cart",
        r"delete (.+) from cart",
        r"cart se (.+) hatao",
        r"cart se (.+) hata do",
        r"(.+) hatao",
        r"(.+) hata do",
    ]

    for pattern in remove_patterns:

        match = re.search(pattern, text)

        if match:

            product_name = match.group(1).strip()

            product = find_product_from_message(
                product_name,
                db,
            )

            if product:
                return AgentIntent(
                    intent="remove_from_cart",
                    product_name=product.name,
                    quantity=1,
                )

    # ========================================================
    # QUANTITY UPDATE
    # ========================================================

    quantity_match = re.search(
        r"(?:quantity|qty|make it|set it to|change to|update to)\s*(\d+)",
        text,
    )

    if quantity_match:

        quantity = int(quantity_match.group(1))

        product = find_product_from_message(
            text,
            db,
        )

        if product:

            return AgentIntent(
                intent="update_quantity",
                product_name=product.name,
                quantity=quantity,
            )

        # Try last conversational product
        return AgentIntent(
            intent="update_quantity",
            quantity=quantity,
        )

    # ========================================================
    # ADD TO CART
    # ========================================================

    add_patterns = [
        r"add (.+)",
        r"add (.+) to cart",
        r"buy (.+)",
        r"i want (.+)",
        r"get me (.+)",
        r"mujhe (.+) chahiye",
        r"(.+) add karo",
        r"(.+) cart mein daal do",
        r"(.+) cart me daal do",
        r"(.+) kharidna hai",
        r"(.+) lena hai",
    ]

    for pattern in add_patterns:

        match = re.search(pattern, text)

        if match:

            product_text = match.group(1).strip()

            product = find_product_from_message(
                product_text,
                db,
            )

            if product:

                quantity = 1

                quantity_match = re.search(
                    r"\b(\d+)\b",
                    product_text,
                )

                if quantity_match:
                    quantity = int(
                        quantity_match.group(1)
                    )

                return AgentIntent(
                    intent="add_to_cart",
                    product_name=product.name,
                    quantity=quantity,
                )

    # ========================================================
    # SEARCH PRICE
    # ========================================================

    max_price = None

    price_match = re.search(
        r"(?:under|below|less than|upto|up to)\s*[₹rs.]?\s*(\d+(?:,\d+)*)",
        text,
    )

    if price_match:

        max_price = Decimal(
            price_match.group(1).replace(",", "")
        )

    # ========================================================
    # SEARCH TERMS / ALIASES
    # ========================================================

    aliases = {
        "shoes": "Running Shoes",
        "shoe": "Running Shoes",
        "running shoes": "Running Shoes",
        "sneakers": "Sneakers",
        "sneaker": "Sneakers",
        "hoodie": "Hoodies",
        "hoodies": "Hoodies",
        "jeans": "Jeans",
        "headphones": "Headphones",
        "headphone": "Headphones",
        "backpack": "Backpacks",
        "backpacks": "Backpacks",
    }

    search_terms = []

    for keyword, mapped_value in aliases.items():

        if keyword in text:
            search_terms.append(mapped_value)

    # Remove price-only words
    cleaned_text = re.sub(
        r"(under|below|less than|upto|up to)\s*[₹rs.]?\s*\d+(?:,\d+)*",
        "",
        text,
    )

    # Remove common search words
    cleaned_text = re.sub(
        r"\b(show|find|search|looking for|want|need|give me|some|please)\b",
        "",
        cleaned_text,
    )

    cleaned_text = re.sub(
        r"\b\d+(?:,\d+)*\b",
        "",
        cleaned_text,
    )

    cleaned_text = cleaned_text.strip()

    if cleaned_text and not search_terms:
        search_terms.append(cleaned_text)

    if not search_terms:
        search_terms = ["products"]

    return AgentIntent(
        intent="search",
        search_terms=search_terms,
        max_price=max_price,
        quantity=1,
    )

def log_agent_action(
    db,
    session_id: str,
    action: str,
    details: str | None = None,
    order_id: int | None = None,
):
    log = AuditLog(
        session_id=session_id,
        action=action,
        details=details,
        order_id=order_id,
    )

    db.add(log)
    db.commit()

def get_order_history(db, session_id: str):
    orders = (
        db.query(Order)
        .filter(Order.session_id == session_id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return orders

# ============================================================
# GEMINI INTENT UNDERSTANDING
# ============================================================

def understand_request(
    message: str,
    db: Session,
    session_id: str | None = None,
) -> AgentIntent:

    context = (
        get_conversation_context(session_id)
        if session_id
        else {}
    )

    previous_products = []

    for product in context.get(
        "last_products",
        [],
    ):

        try:
            previous_products.append(
                product.name
            )
        except Exception:
            pass

    last_recommendation = context.get(
        "last_recommendation"
    )

    last_intent = context.get(
        "last_intent"
    )

    prompt = f"""
You are the shopping assistant for AgentCart.

Understand the user's shopping request.

User message:
{message}

Previous products shown:
{previous_products}

Last recommendation:
{last_recommendation}

Last intent:
{last_intent}

Allowed intents:

1. search
2. add_to_cart
3. remove_from_cart
4. show_cart
5. update_quantity
6. checkout
7. recommend
8. conversation

IMPORTANT RULES:

- "what else should I buy?" means recommend.
- "what else?" means recommend.
- "anything else?" means recommend.
- "suggest something" means recommend.
- "aur kya?" means recommend.
- "kuch aur?" means recommend.
- "add" after a recommendation means add_to_cart.
- "yes" after a recommendation means add_to_cart.
- "haan add karo" after a recommendation means add_to_cart.
- If the user says shoes, understand it as running shoes or sneakers based on context.
- If user gives a price like "under 5000", extract max_price.
- If the user asks to change quantity, extract quantity.
- Do not invent product names.

Return ONLY valid JSON.

Format:

{{
  "intent": "search",
  "search_terms": [],
  "category": null,
  "max_price": null,
  "quantity": 1,
  "product_name": null,
  "product_names": []
}}
"""

    try:

        response = client.models.generate_content(
            model="gemini-3.7-flash",
            contents=prompt,
        )

        raw = response.text.strip()

        if raw.startswith("```"):
            raw = re.sub(
                r"^```(?:json)?",
                "",
                raw,
            )

            raw = re.sub(
                r"```$",
                "",
                raw,
            )

            raw = raw.strip()

        data = json.loads(raw)

        return AgentIntent(
            intent=data.get(
                "intent",
                "search",
            ),
            search_terms=data.get(
                "search_terms",
                [],
            ),
            category=data.get(
                "category"
            ),
            max_price=(
                Decimal(
                    str(data["max_price"])
                )
                if data.get("max_price")
                is not None
                else None
            ),
            quantity=int(
                data.get(
                    "quantity",
                    1,
                )
            ),
            product_name=data.get(
                "product_name"
            ),
            product_names=data.get(
                "product_names",
                [],
            ),
        )

    except Exception as e:

        print(
            "GEMINI INTENT ERROR:",
            repr(e),
        )

        return fallback_understand_request(
            message,
            db,
        )


# ============================================================
# CART
# ============================================================

def get_or_create_cart(
    db: Session,
    session_id: str,
) -> Cart:

    cart = db.scalar(
        select(Cart)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
        )
        .where(
            Cart.session_id == session_id
        )
    )

    if cart:
        return cart

    cart = Cart(
        session_id=session_id
    )

    db.add(cart)
    db.commit()
    db.refresh(cart)

    return cart


# ============================================================
# FIND CART ITEM
# ============================================================

def find_cart_item(
    db: Session,
    session_id: str,
    product_name: str,
):

    cart = db.scalar(
        select(Cart)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product)
        )
        .where(
            Cart.session_id == session_id
        )
    )

    if not cart:
        return None

    target = product_name.lower()

    for item in cart.items:

        if not item.variant:
            continue

        product = item.variant.product

        if not product:
            continue

        if (
            target in product.name.lower()
            or product.name.lower() in target
        ):
            return item

    return None


# ============================================================
# ADD PRODUCT TO CART
# ============================================================

def add_product_to_cart(
    db: Session,
    session_id: str,
    product_name: str,
    requested_quantity: int = 1,
):

    if requested_quantity <= 0:

        return (
            False,
            "Quantity must be at least 1.",
        )

    products = search_catalog(
        db=db,
        search_terms=[product_name],
        max_price=None,
        limit=10,
    )

    if not products:

        return (
            False,
            f"I couldn't find {product_name}.",
        )

    # Prefer exact product name
    selected_product = None

    for product in products:

        if (
            product.name.lower()
            == product_name.lower()
        ):

            selected_product = product
            break

    if not selected_product:
        selected_product = products[0]

    # Find cheapest in-stock variant
    valid_variants = []

    for variant in selected_product.variants:

        if not variant.inventory:
            continue

        if variant.inventory.quantity <= 0:
            continue

        valid_variants.append(
            variant
        )

    if not valid_variants:

        return (
            False,
            f"{selected_product.name} is currently out of stock.",
        )

    selected_variant = min(
        valid_variants,
        key=lambda v: Decimal(
            str(v.price)
        ),
    )

    available_stock = (
        selected_variant.inventory.quantity
    )

    if requested_quantity > available_stock:

        return (
            False,
            f"Only {available_stock} unit(s) of "
            f"{selected_product.name} are available.",
        )

    cart = get_or_create_cart(
        db,
        session_id,
    )

    existing_item = None

    for item in cart.items:

        if (
            item.variant_id
            == selected_variant.id
        ):
            existing_item = item
            break

    if existing_item:

        new_quantity = (
            existing_item.quantity
            + requested_quantity
        )

        if new_quantity > available_stock:

            return (
                False,
                f"You can only have up to "
                f"{available_stock} unit(s) of "
                f"{selected_product.name} in the cart.",
            )

        existing_item.quantity = new_quantity

    else:

        cart_item = CartItem(
            cart_id=cart.id,
            variant_id=selected_variant.id,
            quantity=requested_quantity,
            unit_price=selected_variant.price,
        )

        db.add(cart_item)

    db.commit()
    log_agent_action(
        db,
        session_id,
        "ADD_TO_CART",
        f"Added {product.name} x{requested_quantity}",
    )

    

    return (
        True,
        f"{selected_product.name} was added to your cart.",
    )


# ============================================================
# CROSS-SELL RECOMMENDATIONS
# ============================================================

def get_cross_sell_recommendations(
    db: Session,
    session_id: str,
):

    cart = db.scalar(
        select(Cart)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product)
        )
        .where(
            Cart.session_id == session_id
        )
    )

    if not cart or not cart.items:

        return (
            [],
            "Add something to your cart first, and I'll suggest products that go well with it.",
        )

    cart_products = []

    cart_product_ids = set()
    cart_categories = set()

    for item in cart.items:

        if not item.variant:
            continue

        product = item.variant.product

        if not product:
            continue

        cart_products.append(product)

        cart_product_ids.add(product.id)

        if product.category:
            cart_categories.add(
                product.category.lower()
            )

    # ========================================================
    # CROSS-SELL MAP
    # ========================================================

    cross_sell_map = {
        "sneakers": [
            "Hoodies",
            "Backpacks",
        ],
        "running shoes": [
            "Backpacks",
            "Hoodies",
        ],
        "hoodies": [
            "Sneakers",
            "Backpacks",
        ],
        "jeans": [
            "Hoodies",
            "Sneakers",
        ],
        "headphones": [
            "Backpacks",
        ],
        "backpacks": [
            "Headphones",
            "Hoodies",
        ],
    }

    target_categories = []

    for category in cart_categories:

        mapped = cross_sell_map.get(
            category,
            [],
        )

        for target in mapped:

            if target not in target_categories:
                target_categories.append(
                    target
                )

    # ========================================================
    # FALLBACK RECOMMENDATIONS
    # ========================================================

    if not target_categories:

        target_categories = [
            "Backpacks",
            "Hoodies",
            "Sneakers",
        ]

    recommendations = []

    products = db.scalars(
        select(Product)
        .options(
            selectinload(Product.variants)
            .selectinload(ProductVariant.inventory)
        )
        .where(
            Product.is_active.is_(True)
        )
    ).unique().all()

    # ========================================================
    # FIRST PASS: TARGET CATEGORIES
    # ========================================================

    for product in products:

        if product.id in cart_product_ids:
            continue

        if (
            product.category
            and product.category.lower()
            in {
                x.lower()
                for x in target_categories
            }
        ):

            recommendations.append(
                product
            )

    # ========================================================
    # SECOND PASS: ANY OTHER PRODUCTS
    # ========================================================

    if len(recommendations) < 3:

        for product in products:

            if product.id in cart_product_ids:
                continue

            if product in recommendations:
                continue

            recommendations.append(
                product
            )

            if len(recommendations) >= 3:
                break

    recommendations = recommendations[:3]

    agent_products = convert_to_agent_products(
        recommendations
    )

    if not agent_products:

        return (
            [],
            "I couldn't find additional in-stock recommendations right now.",
        )

    names = [
        product.name
        for product in agent_products
    ]

    if len(names) == 1:

        recommendation_message = (
            f"Based on what's in your cart, "
            f"you might also like {names[0]}. "
            f"Would you like me to add it?"
        )

    elif len(names) == 2:

        recommendation_message = (
            f"Based on what's in your cart, "
            f"you might also like {names[0]} "
            f"and {names[1]}. "
            f"Would you like me to add either?"
        )

    else:

        recommendation_message = (
            f"Based on what's in your cart, "
            f"you might also like "
            f"{', '.join(names[:-1])}, "
            f"and {names[-1]}. "
            f"Would you like me to add any of these?"
        )

    return (
        agent_products,
        recommendation_message,
    )


# ============================================================
# MAIN AGENT
# ============================================================

def chat_with_agent(
    message: str,
    db: Session,
    session_id: str,
):

    message_lower = message.lower().strip()
    
    # ========================================================
    # REVENUE RECOVERY CONFIRMATION
    # ========================================================

    recovery_confirmation_phrases = [
        "yes, recover it",
        "yes recover it",
        "recover it",
        "execute recovery",
        "execute the recovery",
        "launch recovery",
        "start recovery",
        "proceed with recovery",
        "haan recover karo",
        "recovery chalao",
        "recovery karo",
        "secure checkout",
        "secure checkouts",
        "proceed with secure checkout",
        "proceed with secure checkouts",
    ]

    if any(
        phrase in message_lower
        for phrase in recovery_confirmation_phrases
    ):
        context = get_conversation_context(session_id)
        proposal = context.get("last_recovery_proposal")

        if not proposal:
            return (
                "I don't have a pending revenue-recovery proposal to execute. "
                "Please ask me to analyze the pending payments first.",
                [],
                "revenue_recovery",
            )

        # HARD SAFETY GUARD:
        # A blocked recovery proposal can NEVER be executed.
        if proposal.get("action") == "blocked":
            log_agent_action(
                db=db,
                session_id=session_id,
                action="REVENUE_RECOVERY_BLOCKED",
                details=(
                    "Recovery confirmation received, but execution remained "
                    "blocked because revenue at risk exceeded the ₹100,000 "
                    "safety bound."
                ),
            )

            return (
                "🔒 Revenue Recovery Still Blocked\n\n"
                f"Pending orders: {proposal['order_count']}\n"
                f"Revenue at risk: ₹{proposal['at_risk_value']:,.2f}\n\n"
                f"Why: {proposal['reason']}\n\n"
                "The ₹100,000 safety bound has been exceeded, so I will not "
                "execute the recovery action.\n\n"
                "No customer was charged and no recovery action was executed.",
                [],
                "revenue_recovery_blocked",
            )

        if proposal.get("action") == "secure_payment_retry":
            execution = execute_revenue_recovery_sandbox(
                db=db,
                session_id=session_id,
                proposal=proposal,
            )

            save_conversation_context(
                session_id=session_id,
                intent="revenue_recovery_executed",
            )

            context_after = get_conversation_context(session_id)
            context_after["last_recovery_proposal"] = None

            return (
                "✅ Secure revenue recovery approved and prepared.\n\n"
                f"Pending orders: {proposal['order_count']}\n"
                f"Revenue at risk: ₹{proposal['at_risk_value']:,.2f}\n"
                "Action: Secure payment retry\n"
                "Safety bound: ₹100,000\n"
                f"Recovery ID: {execution['recovery_id']}\n\n"
                f"🔒 {execution['message']}",
                [],
                "revenue_recovery_executed",
            )

        return (
            "This recovery proposal cannot be executed because its action "
            "is not permitted by the current safety policy.",
            [],
            "revenue_recovery_blocked",
        )



    # ========================================================
    # CAMPAIGN CONFIRMATION
    # ========================================================

    campaign_confirmation_phrases = [
        "yes, launch it",
        "yes launch it",
        "launch it",
        "launch the campaign",
        "start it",
        "start the campaign",
        "run it",
        "run the campaign",
        "execute it",
        "execute the campaign",
        "yes do it",
        "yes, do it",
        "haan launch karo",
        "haan campaign chalao",
        "campaign chalao",
        "campaign launch karo",
    ]

    if any(
        phrase in message_lower
        for phrase in campaign_confirmation_phrases
    ):
        context = get_conversation_context(session_id)
        proposal = context.get("last_campaign_proposal")

        if proposal:
            execution = execute_campaign_sandbox(
                db=db,
                session_id=session_id,
                proposal=proposal,
            )

            save_conversation_context(
                session_id=session_id,
                intent="campaign_executed",
            )

            context_after = get_conversation_context(session_id)
            context_after["last_campaign_proposal"] = None

            return (
                "✅ Campaign approved and executed.\n\n"
                f"Campaign: {proposal['title']}\n"
                f"Target: {proposal['target']}\n"
                f"Type: {proposal['campaign_type'].replace('_', ' ').title()}\n"
                "Discount cap: 10%\n"
                f"Campaign ID: {execution['campaign_id']}\n\n"
                f"🔒 {execution['message']}",
                [],
                "campaign_executed",
            )

        return (
            "I don't have a pending campaign proposal to execute. "
            "Please ask me to create a campaign first.",
            [],
            "campaign",
        )


        # ORDER HISTORY / ORDER STATUS
    order_phrases = [
        "show my orders",
        "show orders",
        "my orders",
        "order history",
        "previous orders",
        "past orders",
        "mera order",
        "mere orders",
        "order dikhao",
        "orders dikhao",
        "pichle order",
        "pichle orders",
        "last order",
        "latest order",
    ]

    if any(phrase in message_lower for phrase in order_phrases):
        orders = get_order_history(db, session_id)

        log_agent_action(
            db,
            session_id,
            "ORDER_HISTORY_VIEWED",
            f"Viewed {len(orders)} order(s)",
        )

        if not orders:
            return (
                "You don't have any previous orders yet. 📦",
                [],
                "order_history",
            )

        latest = orders[0]

        order_lines = []

        for order in orders[:5]:
            order_lines.append(
                f"Order #{order.id} — "
                f"{order.status.replace('_', ' ').title()} — "
                f"₹{float(order.subtotal):.2f}"
            )

        return (
            "Here are your recent orders:\n\n"
            + "\n".join(order_lines)
            + f"\n\nYour latest order is #{latest.id}. 📦",
            [],
            "order_history",
        )

    # ========================================================
    # HARD RECOMMENDATION DETECTION
    # ========================================================

    # ========================================================
    # REVENUE RECOVERY DETECTION
    # ========================================================

    revenue_recovery_phrases = [
        "analyze my pending payments",
        "pending payments",
        "revenue recovery",
        "recover revenue",
        "recover my revenue",
        "recover pending payments",
        "payment recovery",
        "payments at risk",
        "recovery action",
        "secure payment retry",
        "secure checkout",
        "secure checkouts",
    ]

    revenue_recovery_detected = any(
        phrase in message_lower
        for phrase in revenue_recovery_phrases
    )

    campaign_phrases = [
        "create a campaign",
        "create campaign",
        "start a campaign",
        "launch a campaign",
        "make a campaign",
        "run a campaign",
        "campaign to grow sales",
        "campaign to increase sales",
        "grow my sales",
        "grow sales",
        "increase my sales",
        "increase sales",
        "boost my sales",
        "boost sales",
        "sales campaign",
        "marketing campaign",
        "campaign bana",
        "campaign banao",
        "campaign chalao",
        "sales badhao",
        "sale badhao",
        "revenue campaign",
    ]

    if any(
        phrase in message_lower
        for phrase in campaign_phrases
    ):
        campaign_detected = True
    else:
        campaign_detected = False

    recommendation_phrases = [
        "what else should i buy",
        "what else can i buy",
        "what else should i get",
        "what else can i get",
        "anything else",
        "suggest something",
        "suggest me something",
        "recommend something",
        "recommend me something",
        "what do you recommend",
        "what should i buy",
        "what should i get",
        "what goes with this",
        "what goes well with this",
        "what can i pair with this",
        "aur kya",
        "aur kuch",
        "kuch aur",
        "kuch suggest karo",
        "kuch recommend karo",
        "aur kya le sakta hoon",
        "aur kya loon",
        "iske saath kya",
        "iske sath kya",
        "is ke saath kya",
        "saath mein kya",
        "saath me kya",
    ]

    if any(
        phrase in message_lower
        for phrase in recommendation_phrases
    ):

        (
            recommended_products,
            recommendation_message,
        ) = get_cross_sell_recommendations(
            db=db,
            session_id=session_id,
        )

        if recommended_products:

            save_conversation_context(
                session_id=session_id,
                products=recommended_products,
                recommendation=recommended_products[0].name,
                intent="recommend",
            )

        return (
            recommendation_message,
            recommended_products,
            "cross_sell",
        )

    # ========================================================
    # CONTEXTUAL ADD CONFIRMATION
    # ========================================================

    context = get_conversation_context(
        session_id
    )

    previous_products = context.get(
        "last_products",
        []
    )

    # --------------------------------------------------------
    # NATURAL-LANGUAGE PRODUCT SELECTION
    # --------------------------------------------------------
    # "add first"  -> product #1
    # "add second" -> product #2
    # "add third"  -> product #3

    ordinal_indexes = {
        "first": 0,
        "1st": 0,
        "second": 1,
        "2nd": 1,
        "third": 2,
        "3rd": 2,
        "fourth": 3,
        "4th": 3,
        "fifth": 4,
        "5th": 4,
    }

    if previous_products:
        natural_selection = None

        if message_lower.startswith("add "):
            selection_word = message_lower[4:].strip()

            natural_selection = ordinal_indexes.get(
                selection_word
            )

        if (
            natural_selection is not None
            and 0 <= natural_selection < len(previous_products)
        ):
            selected_product = previous_products[natural_selection]

            try:
                product_name = selected_product.name
            except Exception:
                product_name = None

            if product_name:
                added, result_message = add_product_to_cart(
                    db=db,
                    session_id=session_id,
                    product_name=product_name,
                    requested_quantity=1,
                )

                if added:
                    save_conversation_context(
                        session_id=session_id,
                        intent="add_to_cart",
                    )

                    return (
                        f"{product_name} was added "
                        "to your cart. 🛒",
                        [],
                        "add_to_cart",
                    )

                return (
                    result_message,
                    [],
                    "add_to_cart",
                )

    # --------------------------------------------------------
    # NUMBERED PRODUCT SELECTION
    # --------------------------------------------------------
    # Examples:
    # "add 1"       -> product #1
    # "add 2"       -> product #2
    # "add 1 and 2" -> products #1 and #2
    # "add both"    -> all displayed products
    #
    # If only one product was displayed:
    # "add 2" means quantity 2 of that product.

    previous_products = context.get("last_products", [])

    if previous_products:
        selected_indexes = []

        if message_lower in {
            "add both",
            "add both of them",
            "add both products",
            "dono add karo",
            "dono daal do",
        }:
            selected_indexes = list(range(len(previous_products)))

        else:
            # Parse numbered selections without depending on the
            # module-level "re" import.
            words = (
                message_lower
                .replace(",", " ")
                .replace("&", " ")
                .split()
            )

            if words and words[0] in {"add", "daal", "dal"}:
                for word in words[1:]:
                    if word.isdigit():
                        selected_indexes.append(
                            int(word) - 1
                        )

        valid_indexes = sorted(
            set(
                index
                for index in selected_indexes
                if 0 <= index < len(previous_products)
            )
        )

        if valid_indexes and len(previous_products) > 1:
            added_names = []

            for index in valid_indexes:
                selected_product = previous_products[index]

                try:
                    product_name = selected_product.name
                except Exception:
                    continue

                added, result_message = add_product_to_cart(
                    db=db,
                    session_id=session_id,
                    product_name=product_name,
                    requested_quantity=1,
                )

                if added:
                    added_names.append(product_name)

            if added_names:
                save_conversation_context(
                    session_id=session_id,
                    intent="add_to_cart",
                )

                return (
                    "Added to your cart: "
                    + ", ".join(added_names)
                    + " 🛒",
                    [],
                    "add_to_cart",
                )

    # --------------------------------------------------------
    # QUANTITY + PRODUCT NAME
    # --------------------------------------------------------
    # Examples:
    # "add 2 Velocity Runner"
    # "add 2 of Velocity Runner"

    # --------------------------------------------------------
    # QUANTITY + PRODUCT NAME
    # --------------------------------------------------------
    # Examples:
    # "add 2 Velocity Runner"
    # "add 2 of Velocity Runner"
    #
    # Parse this without using the "re" module because
    # chat_with_agent already has another local "re" reference.

    quantity_words = message_lower.split()

    if (
        len(quantity_words) >= 3
        and quantity_words[0] in {"add", "daal", "dal"}
        and quantity_words[1].isdigit()
    ):
        requested_quantity = int(quantity_words[1])

        requested_name_words = quantity_words[2:]

        if (
            requested_name_words
            and requested_name_words[0] == "of"
        ):
            requested_name_words = requested_name_words[1:]

        requested_name = " ".join(
            requested_name_words
        ).strip()

        if requested_quantity > 0 and requested_name:
            added, result_message = add_product_to_cart(
                db=db,
                session_id=session_id,
                product_name=requested_name,
                requested_quantity=requested_quantity,
            )

            if added:
                save_conversation_context(
                    session_id=session_id,
                    intent="add_to_cart",
                )

                return (
                    result_message + " 🛒",
                    [],
                    "add_to_cart",
                )

    confirmation_phrases = {
        "add",
        "add it",
        "add that",
        "add this",
        "yes",
        "yes please",
        "yeah",
        "yep",
        "haan",
        "han",
        "haan add karo",
        "han add karo",
        "haan add kar do",
        "han add kar do",
        "ha add karo",
        "ha add kar do",
        "yes add it",
        "yes add this",
        "yes add that",
        "yes added",
        "yes add kar do",
        "yes add karo",
        "add karo",
        "add kar do",
        "isko add karo",
        "isko add kar do",
        "ye add karo",
        "ye add kar do",
        "yeh add karo",
        "yeh add kar do",
        "daal do",
        "dal do",
        "cart mein daal do",
        "cart me daal do",
    }

    if message_lower in confirmation_phrases:

        recommended_name = (
            context.get("last_recommendation")
        )

        # If there is no explicit recommendation, fall back
        # to the single most recently displayed product.
        if not recommended_name and len(previous_products) == 1:
            try:
                recommended_name = (
                    previous_products[0].name
                )
            except Exception:
                recommended_name = None

        if not recommended_name:
            return (
                "Which product would you like me to add?",
                [],
                "add_to_cart",
            )

        (
            added,
            result_message,
        ) = add_product_to_cart(
            db=db,
            session_id=session_id,
            product_name=recommended_name,
            requested_quantity=1,
        )

        if added:

            save_conversation_context(
                session_id=session_id,
                recommendation=None,
                intent="add_to_cart",
            )

            return (
                f"{recommended_name} was added "
                "to your cart. 🛒",
                [],
                "add_to_cart",
            )

        return (
            result_message,
            [],
            "add_to_cart",
        )

    # ========================================================
    # DIFFERENT SHOE OPTIONS
    # ========================================================
    #
    # Handles:
    # "show me different"
    # "show me different shoes"
    # "mujhe different shoes dikhao"
    # "5000 ke under different shoes"
    # "mujhe 5000 ke under shoes chahiye show me different"
    # ========================================================

    shoe_words = [
        "shoe",
        "shoes",
        "sneaker",
        "sneakers",
        "jutta",
        "jute",
    ]

    different_words = [
        "different",
        "different ones",
        "different options",
        "more options",
        "other options",
        "show me more",
        "show different",
        "dikhao",
        "dikha do",
        "alag",
        "aur shoes",
    ]

    if (
    any(word in message_lower for word in shoe_words)
    and (
        any(phrase in message_lower for phrase in different_words)
        or "ke under" in message_lower
        or "under" in message_lower
        or "chahiye" in message_lower
        or "chahie" in message_lower
        or "dikhao" in message_lower
        or "dikha do" in message_lower
    )
):

        import re

        max_price = None

        price_match = re.search(
            r"(?:under|below|less than|within|ke under|tak|upto|up to)"
            r"\s*[₹rs.]?\s*(\d+(?:,\d+)*)",
            message_lower,
        )

        if price_match:

            max_price = Decimal(
                price_match.group(1).replace(",", "")
            )

        products = search_catalog(
            db=db,
            search_terms=[
                "shoes",
                "sneakers",
            ],
            max_price=max_price,
            limit=10,
        )

        agent_products = (
            convert_to_agent_products(
                products
            )
        )

        if agent_products:

            save_conversation_context(
                session_id=session_id,
                products=agent_products,
                intent="search",
            )

            return (
                f"I found {len(agent_products)} "
                "different shoe options for you. 👟",
                agent_products,
                "search",
            )

    # ========================================================
    # GEMINI / FALLBACK
    # ========================================================

    intent_data = understand_request(
        message,
        db,
        session_id,
    )

    intent = intent_data.intent

    if revenue_recovery_detected:
        intent = "revenue_recovery"
    elif campaign_detected:
        intent = "campaign"

    # ========================================================
    # CONVERSATION
    # ========================================================

    if intent == "conversation":

        save_conversation_context(
            session_id,
            intent="conversation",
        )

        if message_lower in {
            "hi",
            "hello",
            "hey",
            "hii",
            "hiii",
        }:

            return (
                "Hey! 👋 I'm your AgentCart shopping assistant. "
                "Tell me what you're looking for and I'll help you find it.",
                [],
                "conversation",
            )

        if "thank" in message_lower:

            return (
                "You're welcome! 😊 "
                "Let me know if you need anything else.",
                [],
                "conversation",
            )

        return (
            "Sure! Tell me what you'd like to shop for.",
            [],
            "conversation",
        )

    # ========================================================
    # RECOMMEND
    # ========================================================

    if intent == "revenue_recovery":
        proposal = get_revenue_recovery_proposal(
            db=db,
            session_id=session_id,
        )

        if not proposal["has_opportunity"]:
            log_agent_action(
                db=db,
                session_id=session_id,
                action="REVENUE_RECOVERY_PROPOSED",
                details="No pending payments found.",
            )

            return (
                "💸 AI Revenue Recovery\n\n"
                "No pending payments are currently at risk. "
                "There is nothing to recover right now.",
                [],
                "revenue_recovery",
            )

        if proposal["action"] == "blocked":
            log_agent_action(
                db=db,
                session_id=session_id,
                action="REVENUE_RECOVERY_BLOCKED",
                details=proposal["reason"],
            )

            save_conversation_context(
                session_id=session_id,
                intent="revenue_recovery",
                recovery_proposal=proposal,
            )

            return (
                "🔒 Revenue Recovery Blocked\n\n"
                f"Pending orders: {proposal['order_count']}\n"
                f"Revenue at risk: ₹{proposal['at_risk_value']:,.2f}\n\n"
                f"Why: {proposal['reason']}\n\n"
                f"{proposal['bounded_action']}\n\n"
                "No recovery action can be executed while the safety bound is exceeded.",
                [],
                "revenue_recovery",
            )

        recovery_message = (
            "💸 AI Revenue Recovery Proposal\n\n"
            f"Pending orders: {proposal['order_count']}\n"
            f"Revenue at risk: ₹{proposal['at_risk_value']:,.2f}\n\n"
            "Recommended action: Secure payment retry\n"
            f"Why: {proposal['reason']}\n\n"
            f"🔒 {proposal['bounded_action']}\n\n"
            "Say “Yes, recover it” to proceed."
        )

        log_agent_action(
            db=db,
            session_id=session_id,
            action="REVENUE_RECOVERY_PROPOSED",
            details=(
                f"Orders: {proposal['order_count']}. "
                f"Revenue at risk: ₹{proposal['at_risk_value']:,.2f}. "
                "Recommended action: secure payment retry."
            ),
        )

        save_conversation_context(
            session_id=session_id,
            intent="revenue_recovery",
            recovery_proposal=proposal,
        )

        return (
            recovery_message,
            [],
            "revenue_recovery",
        )

    if intent == "campaign":
        proposal = get_campaign_proposal(
            db=db,
            session_id=session_id,
        )

        campaign_message = (
            "📈 AI Campaign Proposal\n\n"
            f"Campaign: {proposal['title']}\n"
            f"Type: {proposal['campaign_type'].replace('_', ' ').title()}\n"
            f"Target: {proposal['target']}\n"
            f"Why: {proposal['reason']}\n"
            f"Offer: {proposal['offer']}\n\n"
            f"🔒 {proposal['bounded_action']}"
        )

        save_conversation_context(
            session_id=session_id,
            intent="campaign",
            campaign_proposal=proposal,
        )

        return (
            campaign_message,
            [],
            "campaign",
        )

    if intent == "recommend":

        (
            recommended_products,
            recommendation_message,
        ) = get_cross_sell_recommendations(
            db=db,
            session_id=session_id,
        )

        if recommended_products:

            save_conversation_context(
                session_id=session_id,
                products=recommended_products,
                recommendation=recommended_products[0].name,
                intent="recommend",
            )

        return (
            recommendation_message,
            recommended_products,
            "cross_sell",
        )

    # ========================================================
    # SHOW CART
    # ========================================================

    if intent == "show_cart":

        cart = db.scalar(
            select(Cart)
            .options(
                selectinload(Cart.items)
                .selectinload(CartItem.variant)
                .selectinload(
                    ProductVariant.product
                )
            )
            .where(
                Cart.session_id == session_id
            )
        )

        if not cart or not cart.items:

            return (
                "Your cart is empty. 🛒",
                [],
                "show_cart",
            )

        lines = [
            "Here's what's in your cart:"
        ]

        total = Decimal("0")

        for item in cart.items:

            if not item.variant:
                continue

            product = item.variant.product

            if not product:
                continue

            line_total = (
                Decimal(
                    str(item.unit_price)
                )
                * item.quantity
            )

            total += line_total

            lines.append(
                f"• {product.name} × "
                f"{item.quantity} — "
                f"₹{line_total:.2f}"
            )

        lines.append(
            f"\nTotal: ₹{total:.2f}"
        )

        return (
            "\n".join(lines),
            [],
            "show_cart",
        )

    # ========================================================
    # ADD TO CART
    # ========================================================

    if intent == "add_to_cart":

        product_name = (
            intent_data.product_name
        )

        # ----------------------------------------------------
        # Multi-product support
        # ----------------------------------------------------

        product_names = (
            intent_data.product_names
            or []
        )

        if not product_name and product_names:

            added_names = []

            for name in product_names:

                (
                    added,
                    result_message,
                ) = add_product_to_cart(
                    db=db,
                    session_id=session_id,
                    product_name=name,
                    requested_quantity=(
                        intent_data.quantity
                        or 1
                    ),
                )

                if added:

                    added_names.append(name)

            if added_names:

                save_conversation_context(
                    session_id=session_id,
                    intent="add_to_cart",
                )

                return (
                    "Added to your cart: "
                    + ", ".join(
                        added_names
                    )
                    + " 🛒",
                    [],
                    "add_to_cart",
                )

            return (
                "I couldn't add those products "
                "to your cart.",
                [],
                "add_to_cart",
            )

        if not product_name:

            return (
                "Which product would you like "
                "me to add to your cart?",
                [],
                "add_to_cart",
            )

        (
            added,
            result_message,
        ) = add_product_to_cart(
            db=db,
            session_id=session_id,
            product_name=product_name,
            requested_quantity=(
                intent_data.quantity
                or 1
            ),
        )

        if added:

            save_conversation_context(
                session_id=session_id,
                intent="add_to_cart",
            )

            return (
                result_message + " 🛒",
                [],
                "add_to_cart",
            )

        return (
            result_message,
            [],
            "add_to_cart",
        )

    # ========================================================
    # REMOVE FROM CART
    # ========================================================

    if intent == "remove_from_cart":

        product_name = (
            intent_data.product_name
        )

        if not product_name:

            return (
                "Which product would you like "
                "me to remove?",
                [],
                "remove_from_cart",
            )

        item = find_cart_item(
            db=db,
            session_id=session_id,
            product_name=product_name,
        )

        if not item:

            return (
                f"{product_name} isn't in your cart.",
                [],
                "remove_from_cart",
            )

        removed_name = (
            item.variant.product.name
        )

        db.delete(item)
        db.commit()

        return (
            f"{removed_name} was removed "
            "from your cart. 🗑️",
            [],
            "remove_from_cart",
        )

    # ========================================================
    # UPDATE QUANTITY
    # ========================================================

    if intent == "update_quantity":

        product_name = (
            intent_data.product_name
        )

        quantity = (
            intent_data.quantity
        )

        if not product_name:

            context_products = context.get(
                "last_products",
                [],
            )

            if context_products:

                product_name = (
                    context_products[0].name
                )

        if not product_name:

            return (
                "Which product's quantity "
                "should I update?",
                [],
                "update_quantity",
            )

        item = find_cart_item(
            db=db,
            session_id=session_id,
            product_name=product_name,
        )

        if not item:

            return (
                f"{product_name} isn't in your cart.",
                [],
                "update_quantity",
            )

        if quantity <= 0:

            return (
                "Quantity must be at least 1.",
                [],
                "update_quantity",
            )

        inventory = item.variant.inventory

        if (
            inventory
            and quantity > inventory.quantity
        ):

            return (
                f"Only {inventory.quantity} "
                "unit(s) are available.",
                [],
                "update_quantity",
            )

        item.quantity = quantity

        db.commit()

        return (
            f"{item.variant.product.name} "
            f"quantity updated to {quantity}.",
            [],
            "update_quantity",
        )

    # ========================================================
    # CHECKOUT
    # ========================================================

    if intent == "checkout":

        save_conversation_context(
            session_id=session_id,
            intent="checkout",
        )

        return (
            "You're ready for checkout. "
            "I'll take you to secure Razorpay payment.",
            [],
            "checkout",
        )

    # ========================================================
    # SEARCH
    # ========================================================

    search_terms = (
        intent_data.search_terms
        or []
    )

    if (
        not search_terms
        and intent_data.category
    ):

        search_terms = [
            intent_data.category
        ]

    if not search_terms:

        search_terms = [
            message_lower
        ]

    products = search_catalog(
        db=db,
        search_terms=search_terms,
        max_price=intent_data.max_price,
        limit=10,
    )

    agent_products = (
        convert_to_agent_products(
            products
        )
    )

    save_conversation_context(
        session_id=session_id,
        products=agent_products,
        intent="search",
    )

    if not agent_products:

        return (
            "I couldn't find matching products "
            "right now.",
            [],
            "search",
        )

    if len(agent_products) == 1:

        message_text = (
            f"I found "
            f"{agent_products[0].name} "
            f"for "
            f"₹{agent_products[0].price:.2f}."
        )

    else:

        message_text = (
            f"I found "
            f"{len(agent_products)} "
            "matching product options "
            "for you."
        )

    return (
        message_text,
        agent_products,
        "search",
    )
