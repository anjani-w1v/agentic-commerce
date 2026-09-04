"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const SESSION_ID = "demo-user-001";

type OrderItem = {
  id: number;
  variant_id: number;
  product_name: string;
  sku: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Order = {
  id: number;
  status: string;
  payment_status: string;
  subtotal: number;
  currency: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  items: OrderItem[];
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function label(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllOrders, setShowAllOrders] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          `${API_URL}/api/orders/history/${SESSION_ID}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Failed to load orders");
        }

        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Orders loading failed:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const paidOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.payment_status?.toLowerCase() === "paid",
      ),
    [orders],
  );

  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.payment_status?.toLowerCase() !== "paid",
      ),
    [orders],
  );

  const revenue = useMemo(
    () =>
      paidOrders.reduce(
        (sum, order) => sum + Number(order.subtotal || 0),
        0,
      ),
    [paidOrders],
  );

  return (
    <main className="theme-light min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Link
          href="/merchant"
          className="text-sm font-bold text-[var(--primary)]"
        >
          ← Merchant Console
        </Link>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
            Merchant Operations
          </p>

          <h1 className="mt-1 text-3xl font-black">
            Orders
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Monitor customer orders and payment status.
          </p>
        </div>

        {/* SUMMARY */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">
              Total Orders
            </p>
            <p className="mt-2 text-2xl font-black">
              {loading ? "..." : orders.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">
              Paid
            </p>
            <p className="mt-2 text-2xl font-black">
              {loading ? "..." : paidOrders.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">
              Pending
            </p>
            <p className="mt-2 text-2xl font-black">
              {loading ? "..." : pendingOrders.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">
              Successful Revenue
            </p>
            <p className="mt-2 text-xl font-black text-[var(--primary)]">
              {loading ? "..." : money(revenue)}
            </p>
          </div>
        </div>

        {/* ORDERS */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <div className="text-3xl">📦</div>
              <p className="mt-3 font-bold">
                No orders yet
              </p>
            </div>
          ) : (
            (showAllOrders ? orders : orders.slice(0, 5)).map((order) => {
              const paid =
                order.payment_status?.toLowerCase() === "paid";

              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-black">
                          Order #{order.id}
                        </h2>

                        <span
                          className={
                            paid
                              ? "rounded-full bg-[var(--sage)] px-2.5 py-1 text-[10px] font-bold text-[var(--primary)]"
                              : "rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700"
                          }
                        >
                          {paid ? "PAID" : "PAYMENT PENDING"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Order status: {label(order.status)}
                      </p>
                    </div>

                    <p className="text-xl font-black">
                      {money(Number(order.subtotal || 0))}
                    </p>
                  </div>

                  <div className="mt-5 space-y-2">
                    {order.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-xl bg-[var(--agent-bg)] p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {item.product_name}
                          </p>

                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Qty {item.quantity}
                            {item.color
                              ? ` · ${item.color}`
                              : ""}
                            {item.size
                              ? ` · ${item.size}`
                              : ""}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-extrabold">
                          {money(
                            Number(item.total_price || 0),
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <p className="text-xs font-bold text-[var(--muted)]">
                      Customer
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {order.shipping_name || "Customer"}
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {order.shipping_address_line1},{" "}
                      {order.shipping_city},{" "}
                      {order.shipping_state}{" "}
                      {order.shipping_postal_code}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {orders.length > 5 && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllOrders((current) => !current)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-xs font-black transition hover:bg-[var(--agent-bg)]"
              >
                {showAllOrders
                  ? "Show less ↑"
                  : `See more · ${orders.length - 5} more orders ↓`}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
