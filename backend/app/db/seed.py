from decimal import Decimal

from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.inventory import Inventory


PRODUCTS = [
    {
        "name": "Velocity Runner",
        "description": "Lightweight running shoes designed for daily training and road running.",
        "category": "Running Shoes",
        "brand": "AeroFit",
        "image_url": "https://placehold.co/600x600?text=Velocity+Runner",
        "rating": 4.6,
        "variants": [
            {"sku": "VR-BLK-7", "price": 4499, "color": "Black", "size": "7", "stock": 12},
            {"sku": "VR-BLK-8", "price": 4499, "color": "Black", "size": "8", "stock": 18},
            {"sku": "VR-BLK-9", "price": 4499, "color": "Black", "size": "9", "stock": 8},
            {"sku": "VR-WHT-8", "price": 4299, "color": "White", "size": "8", "stock": 10},
        ],
    },
    {
        "name": "StreetFlex Sneakers",
        "description": "Comfortable everyday sneakers with a clean streetwear design.",
        "category": "Sneakers",
        "brand": "StreetFlex",
        "image_url": "https://placehold.co/600x600?text=StreetFlex",
        "rating": 4.4,
        "variants": [
            {"sku": "SF-BLK-7", "price": 3299, "color": "Black", "size": "7", "stock": 15},
            {"sku": "SF-BLK-8", "price": 3299, "color": "Black", "size": "8", "stock": 11},
            {"sku": "SF-WHT-8", "price": 3199, "color": "White", "size": "8", "stock": 9},
        ],
    },
    {
        "name": "Cloud Hoodie",
        "description": "Soft fleece hoodie for everyday comfort.",
        "category": "Hoodies",
        "brand": "NorthPeak",
        "image_url": "https://placehold.co/600x600?text=Cloud+Hoodie",
        "rating": 4.7,
        "variants": [
            {"sku": "CH-BLK-M", "price": 1799, "color": "Black", "size": "M", "stock": 20},
            {"sku": "CH-BLK-L", "price": 1799, "color": "Black", "size": "L", "stock": 16},
            {"sku": "CH-GRY-M", "price": 1699, "color": "Grey", "size": "M", "stock": 13},
        ],
    },
    {
        "name": "Everyday Denim",
        "description": "Classic straight-fit denim jeans for everyday wear.",
        "category": "Jeans",
        "brand": "UrbanThread",
        "image_url": "https://placehold.co/600x600?text=Everyday+Denim",
        "rating": 4.3,
        "variants": [
            {"sku": "ED-BLU-30", "price": 2199, "color": "Blue", "size": "30", "stock": 14},
            {"sku": "ED-BLU-32", "price": 2199, "color": "Blue", "size": "32", "stock": 18},
            {"sku": "ED-BLK-32", "price": 2299, "color": "Black", "size": "32", "stock": 12},
        ],
    },
    {
        "name": "Pulse Wireless Headphones",
        "description": "Wireless over-ear headphones with long battery life.",
        "category": "Headphones",
        "brand": "PulseAudio",
        "image_url": "https://placehold.co/600x600?text=Pulse+Headphones",
        "rating": 4.5,
        "variants": [
            {"sku": "PW-BLK-STD", "price": 3999, "color": "Black", "size": "Standard", "stock": 25},
            {"sku": "PW-WHT-STD", "price": 3899, "color": "White", "size": "Standard", "stock": 17},
        ],
    },
    {
        "name": "Urban Daypack",
        "description": "Water-resistant everyday backpack suitable for college and work.",
        "category": "Backpacks",
        "brand": "CarryPro",
        "image_url": "https://placehold.co/600x600?text=Urban+Daypack",
        "rating": 4.4,
        "variants": [
            {"sku": "UD-BLK-STD", "price": 2499, "color": "Black", "size": "Standard", "stock": 21},
            {"sku": "UD-NAV-STD", "price": 2399, "color": "Navy", "size": "Standard", "stock": 15},
        ],
    },
]


def seed():
    db = SessionLocal()

    try:
        merchant = db.scalar(
            select(Merchant).where(Merchant.name == "AgentCart Demo Store")
        )

        if merchant is None:
            merchant = Merchant(
                name="AgentCart Demo Store"
            )
            db.add(merchant)
            db.flush()

        existing_product = db.scalar(
            select(Product).limit(1)
        )

        if existing_product:
            print("Catalog already contains products. Nothing to seed.")
            return

        for product_data in PRODUCTS:
            variants = product_data.pop("variants")

            product = Product(
                merchant_id=merchant.id,
                **product_data,
            )

            db.add(product)
            db.flush()

            for variant_data in variants:
                stock = variant_data.pop("stock")

                variant = ProductVariant(
                    product_id=product.id,
                    price=Decimal(str(variant_data.pop("price"))),
                    currency="INR",
                    **variant_data,
                )

                db.add(variant)
                db.flush()

                inventory = Inventory(
                    variant_id=variant.id,
                    quantity=stock,
                    reserved_quantity=0,
                )

                db.add(inventory)

        db.commit()

        print("Catalog seeded successfully.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed()