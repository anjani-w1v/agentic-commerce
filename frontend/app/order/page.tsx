"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

interface OrderItem {
  id: number;
  variant_id: number;
  product_name: string;
  sku: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unit_price: string;
  total_price: string;
}

interface Order {
  id: number;
  session_id: string;
  status: string;
  subtotal: string;
  currency: string;

  shipping_name: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;

  items: OrderItem[];
}

function OrderDetails() {
  const searchParams = useSearchParams();

  const orderId = searchParams.get("order_id");

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) {
        setError("Order ID is missing");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/orders/${orderId}?session_id=demo-user-001`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to fetch order"
          );
        }

        const data: Order =
          await response.json();

        setOrder(data);
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load order details"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          color: "#111827",
        }}
      >
        Loading order...
      </main>
    );
  }

  if (error || !order) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          color: "#dc2626",
        }}
      >
        {error || "Order not found"}
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto",
        }}
      >
        <button
          onClick={() => {
            window.location.href = "/";
          }}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "15px",
            marginBottom: "20px",
            color: "#111827",
          }}
        >
          ← Continue Shopping
        </button>

        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "30px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
              marginBottom: "30px",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "30px",
                  color: "#111827",
                }}
              >
                Order #{order.id}
              </h1>

              <p
                style={{
                  color: "#475569",
                  marginTop: "8px",
                }}
              >
                Thank you for your purchase!
              </p>
            </div>

            <div
              style={{
                background:
                  order.status === "paid"
                    ? "#dcfce7"
                    : "#fef3c7",
                color:
                  order.status === "paid"
                    ? "#166534"
                    : "#92400e",
                padding: "10px 16px",
                borderRadius: "999px",
                fontWeight: "700",
              }}
            >
              {order.status === "paid"
                ? "✓ PAID"
                : order.status.toUpperCase()}
            </div>
          </div>

          <section
            style={{
              borderTop:
                "1px solid #e5e7eb",
              paddingTop: "24px",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                color: "#111827",
              }}
            >
              Items
            </h2>

            {order.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: "20px",
                  padding: "18px 0",
                  borderBottom:
                    "1px solid #f1f5f9",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: "700",
                      color: "#111827",
                    }}
                  >
                    {item.product_name}
                  </div>

                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "14px",
                      marginTop: "5px",
                    }}
                  >
                    {item.sku}
                    {" • "}
                    Qty: {item.quantity}
                  </div>
                </div>

                <div
                  style={{
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  ₹
                  {Number(
                    item.total_price
                  ).toFixed(2)}
                </div>
              </div>
            ))}
          </section>

          <section
            style={{
              marginTop: "25px",
              paddingTop: "20px",
              borderTop:
                "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                fontSize: "20px",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              <span>Total</span>

              <span>
                ₹
                {Number(
                  order.subtotal
                ).toFixed(2)}
              </span>
            </div>
          </section>

          <section
            style={{
              marginTop: "30px",
              paddingTop: "25px",
              borderTop:
                "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                color: "#111827",
              }}
            >
              Delivery Address
            </h2>

            <p
              style={{
                lineHeight: "1.7",
                color: "#475569",
              }}
            >
              <strong
                style={{
                  color: "#111827",
                }}
              >
                {order.shipping_name}
              </strong>

              <br />

              {order.shipping_address_line1}

              {order.shipping_address_line2 && (
                <>
                  <br />
                  {order.shipping_address_line2}
                </>
              )}

              <br />

              {order.shipping_city},{" "}
              {order.shipping_state}{" "}
              {order.shipping_postal_code}

              <br />

              {order.shipping_country}

              <br />

              📞 {order.shipping_phone}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function LoadingOrder() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        color: "#111827",
      }}
    >
      Loading order...
    </main>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<LoadingOrder />}>
      <OrderDetails />
    </Suspense>
  );
}