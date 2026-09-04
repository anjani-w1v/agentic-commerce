"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const SESSION_ID = "demo-user-001";

type Order = {
  id: number;
  status: string;
  payment_status: string;
  subtotal: number;
  currency: string;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function RecoveryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
        console.error("Recovery data loading failed:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.payment_status?.toLowerCase() !== "paid",
      ),
    [orders],
  );

  const atRisk = useMemo(
    () =>
      pendingOrders.reduce(
        (sum, order) => sum + Number(order.subtotal || 0),
        0,
      ),
    [pendingOrders],
  );

  const withinSafetyBound = atRisk <= 100000;

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
            AI Revenue Recovery
          </p>

          <h1 className="mt-1 text-3xl font-black">
            Recover At-Risk Revenue
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Identify incomplete payments and prepare a secure retry
            workflow without automatically charging customers.
          </p>
        </div>

        {/* HERO */}
        <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💸</span>

                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black text-amber-700">
                  REVENUE OPPORTUNITY
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-black">
                {loading
                  ? "Analyzing payments..."
                  : pendingOrders.length > 0
                    ? `${money(atRisk)} potentially recoverable`
                    : "No revenue currently at risk"}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
                {pendingOrders.length > 0
                  ? `${pendingOrders.length} payment ${
                      pendingOrders.length === 1
                        ? "attempt"
                        : "attempts"
                    } have not completed successfully.`
                  : "All current payment attempts are complete."}
              </p>
            </div>

            {pendingOrders.length > 0 && (
              <Link
                href="/"
                className="rounded-xl bg-[var(--primary)] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
              >
                Open AI Recovery Agent →
              </Link>
            )}
          </div>
        </div>

        {/* METRICS */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">
              At-Risk Orders
            </p>
            <p className="mt-2 text-2xl font-black">
              {loading ? "..." : pendingOrders.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">
              Revenue at Risk
            </p>
            <p className="mt-2 text-xl font-black text-[var(--primary)]">
              {loading ? "..." : money(atRisk)}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">
              Safety Bound
            </p>
            <p className="mt-2 text-xl font-black">
              ₹1,00,000
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">
              Recovery Status
            </p>
            <p className="mt-2 text-sm font-black">
              {loading
                ? "Analyzing"
                : pendingOrders.length === 0
                  ? "Clear"
                  : withinSafetyBound
                    ? "Safe to propose"
                    : "Blocked"}
            </p>
          </div>
        </div>

        {/* SAFETY */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--surface)] p-5">
            <div className="text-xl">🔒</div>
            <p className="mt-3 font-black">No auto-charge</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Customers are never charged automatically by the recovery agent.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--surface)] p-5">
            <div className="text-xl">✋</div>
            <p className="mt-3 font-black">Merchant approval</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Recovery execution requires an explicit confirmation.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--surface)] p-5">
            <div className="text-xl">🧾</div>
            <p className="mt-3 font-black">Audit logged</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Proposed and executed actions are recorded in the audit trail.
            </p>
          </div>
        </div>

        {/* PENDING ORDERS */}
        <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black">
                Payment Recovery Queue
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Orders requiring payment completion
              </p>
            </div>

            <span className="rounded-full bg-[var(--sage)] px-3 py-1 text-[10px] font-bold text-[var(--primary)]">
              {pendingOrders.length} OPEN
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {!loading && pendingOrders.length === 0 ? (
              <div className="rounded-2xl bg-[var(--agent-bg)] p-8 text-center">
                <div className="text-3xl">✅</div>
                <p className="mt-3 font-bold">
                  No pending payments
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  There is currently no recovery opportunity.
                </p>
              </div>
            ) : (
              pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-2xl bg-[var(--agent-bg)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-black">
                      Order #{order.id}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Payment:{" "}
                      {order.payment_status || "pending"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="font-black">
                      {money(Number(order.subtotal || 0))}
                    </p>

                    <span className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                      AT RISK
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
