"use client";

import { useEffect, useMemo, useState } from "react";

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
  session_id: string;
  status: string;
  payment_status: string;
  subtotal: number;
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
};

type AuditLog = {
  id: number;
  session_id: string;
  action: string;
  details: string | null;
  order_id: number | null;
  created_at: string;
};

type Props = {
  darkMode: boolean;
  onOpenAgent: (prompt?: string) => void;
  onViewOrders: () => void;
  section?: "overview" | "growth" | "recovery" | "orders" | "audit";
};

export default function MerchantDashboard({
  darkMode,
  onOpenAgent,
  onViewOrders,
  section = "overview",
}: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch(
          `${API_URL}/api/orders/history/${SESSION_ID}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to load orders");
        }

        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Dashboard order loading failed:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  useEffect(() => {
    async function loadAuditLogs() {
      try {
        const response = await fetch(
          `${API_URL}/api/audit/${SESSION_ID}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to load audit logs");
        }

        const data = await response.json();
        setAuditLogs(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Dashboard audit loading failed:", error);
      } finally {
        setAuditLoading(false);
      }
    }

    loadAuditLogs();
  }, []);

  const pendingPaymentOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.payment_status?.toLowerCase() !== "paid",
    );
  }, [orders]);

  const pendingPaymentValue = useMemo(() => {
    return pendingPaymentOrders.reduce(
      (total, order) => total + Number(order.subtotal || 0),
      0,
    );
  }, [pendingPaymentOrders]);

  const paidOrdersList = useMemo(() => {
    return orders.filter(
      (order) =>
        order.payment_status?.toLowerCase() === "paid",
    );
  }, [orders]);

  const revenue = useMemo(() => {
    return paidOrdersList.reduce(
      (total, order) => total + Number(order.subtotal || 0),
      0,
    );
  }, [paidOrdersList]);

  const customerCount = useMemo(() => {
    const customers = new Set(
      orders
        .map((order) => order.shipping_phone)
        .filter(Boolean),
    );

    return customers.size;
  }, [orders]);

  const averageOrderValue = useMemo(() => {
  if (!paidOrdersList.length) return 0;

  return revenue / paidOrdersList.length;
}, [paidOrdersList, revenue]);

  const paidOrders = useMemo(() => {
  return orders.filter(
    (order) =>
      order.payment_status?.toLowerCase() === "paid",
  ).length;
}, [orders]);

  const productSales = useMemo(() => {
    const sales = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();

    paidOrdersList.forEach((order) => {
      order.items.forEach((item) => {
        const existing = sales.get(item.product_name);

        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += Number(item.total_price || 0);
        } else {
          sales.set(item.product_name, {
            name: item.product_name,
            quantity: item.quantity,
            revenue: Number(item.total_price || 0),
          });
        }
      });
    });

    return Array.from(sales.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );
  }, [paidOrdersList]);

  const topProduct = productSales[0];

  const categorySales = useMemo(() => {
    const categories = new Map<string, number>();

    paidOrdersList.forEach((order) => {
      order.items.forEach((item) => {
        const category = item.product_name;

        categories.set(
          category,
          (categories.get(category) || 0) +
            Number(item.total_price || 0),
        );
      });
    });

    return Array.from(categories.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [paidOrdersList]);

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  const statusLabel = (status: string) => {
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const showOverview =
    section === "overview";

  const showGrowth =
    section === "growth";

  const showRecovery =
    section === "recovery";

  const showOrders =
    section === "orders";

  const showAudit =
    section === "audit";

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--sage)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
            ✦ AI Commerce Dashboard
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
            Grow your store with{" "}
            <span className="text-[var(--primary)]">AI</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            Track your store performance and manage AI-powered shopping from
            one simple workspace.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onOpenAgent()}
              className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-dark)]"
            >
              ✨ Open AI Agent
            </button>

            <button
              onClick={onViewOrders}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-bold transition hover:bg-[var(--hover)]"
            >
              View Orders →
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-16 hidden h-64 w-64 rounded-full bg-[var(--sage)] opacity-60 blur-2xl sm:block"/>
      </div>


      {/* REAL STATS */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon="₹"
          label="Revenue"
          value={
            loading
              ? "..."
              : formatCurrency(revenue)
          }
          change={paidOrdersList.length ? "Live" : "—"}
        />

        <StatCard
          icon="🛍️"
          label="Orders"
          value={loading ? "..." : String(paidOrdersList.length)}
          change={paidOrdersList.length ? "Paid" : "—"}
        />

        <StatCard
          icon="👥"
          label="Customers"
          value={
            loading
              ? "..."
              : String(customerCount)
          }
          change={customerCount ? "Live" : "—"}
        />

        <StatCard
          icon="📦"
          label="Avg. Order"
          value={
            loading
              ? "..."
              : formatCurrency(averageOrderValue)
          }
          change={paidOrdersList.length ? `${paidOrdersList.length} paid` : "—"}
        />
      </div>

      {/* AI REVENUE GROWTH ENGINE */}
      <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-extrabold">AI Revenue Growth Engine</h2>
              <span className="rounded-full bg-[var(--sage)] px-2 py-1 text-[10px] font-bold text-[var(--primary)]">
                AGENTIC
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              The commerce agent turns customer conversations into measurable
              revenue opportunities across discovery, upsell, campaigns and recovery.
            </p>
          </div>

          <button
            onClick={() =>
              onOpenAgent(
                "Analyze my sales and recommend the highest-impact action to grow revenue."
              )
            }
            className="shrink-0 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
          >
            Ask AI to Grow Revenue →
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
            <p className="text-xs font-bold text-[var(--muted)]">
              💰 Revenue
            </p>
            <p className="mt-2 text-lg font-extrabold">
              {formatCurrency(revenue)}
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Successful payments
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
            <p className="text-xs font-bold text-[var(--muted)]">
              🛍️ Basket Size
            </p>
            <p className="mt-2 text-lg font-extrabold">
              {formatCurrency(averageOrderValue)}
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Average order value
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
            <p className="text-xs font-bold text-[var(--muted)]">
              🎯 Campaigns
            </p>
            <p className="mt-2 text-lg font-extrabold">
              AI-powered
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Growth proposals with approval gates
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
            <p className="text-xs font-bold text-[var(--muted)]">
              🔒 Safe Actions
            </p>
            <p className="mt-2 text-lg font-extrabold">
              Bounded
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Explainable + merchant confirmed
            </p>
          </div>
        </div>
      </div>

      {/* SALES + AI */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold">Sales overview</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Based on your real orders
              </p>
            </div>

            <span className="rounded-lg bg-[var(--sage)] px-2.5 py-1 text-xs font-bold text-[var(--primary)]">
              {paidOrdersList.length} paid orders
            </span>
          </div>

          {paidOrdersList.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-[var(--muted)]">
              No orders yet.
            </div>
          ) : (
            <div className="mt-7 flex h-48 items-end gap-2 sm:gap-4">
  {paidOrdersList.length === 0 ? (
    <div className="flex w-full items-center justify-center text-sm text-[var(--muted)]">
      No paid sales yet.
    </div>
  ) : (
    paidOrdersList.slice(0, 7).reverse().map((order, index) => {
      const maxRevenue = Math.max(
        ...paidOrdersList.map((item) =>
          Number(item.subtotal || 0),
        ),
      );

      const amount = Number(order.subtotal || 0);

      const height = Math.max(
        12,
        (amount / maxRevenue) * 100,
      );

      return (
        <div
          key={order.id}
          className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
        >
          <span className="text-[9px] font-bold text-[var(--muted)] sm:text-[10px]">
            ₹{amount.toLocaleString("en-IN")}
          </span>

          <div
            className="w-full max-w-12 rounded-t-xl bg-[var(--primary)] opacity-80 transition-all duration-300 group-hover:opacity-100"
            style={{
              height: `${height}%`,
            }}
          />

          <span className="text-[10px] text-[var(--muted)]">
            #{order.id}
          </span>
        </div>
      );
    })
  )}
</div>
          )}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold">AI assistant</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Your commerce agent
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sage)] text-lg">
              ✨
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-[var(--agent-bg)] p-4">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
              Agent is active
            </div>

            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Helping customers discover products, build carts and complete
              purchases.
            </p>
          </div>

          <button
            onClick={() => onOpenAgent()}
            className="mt-4 w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
          >
            Manage AI Agent
          </button>
        </div>
      </div>

      {/* AI BUSINESS INSIGHT */}
<div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
  <div className="flex items-start gap-4">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sage)] text-xl">
      ✨
    </div>

    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-extrabold">AI Business Insight</h2>
        <span className="rounded-full bg-[var(--sage)] px-2 py-1 text-[10px] font-bold text-[var(--primary)]">
          LIVE
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Your store has generated{" "}
        <span className="font-bold text-[var(--primary)]">
          {formatCurrency(revenue)}
        </span>{" "}
        from{" "}
        <span className="font-bold">
          {paidOrdersList.length} successful payments
        </span>
        . Your average order value is{" "}
        <span className="font-bold">
          {formatCurrency(averageOrderValue)}
        </span>
        .
      </p>

      <div className="mt-4 rounded-2xl bg-[var(--agent-bg)] p-4">
        <p className="text-xs font-bold text-[var(--primary)]">
          💡 Growth opportunity
        </p>

        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          Use the AI Agent to recommend complementary products during
          checkout and increase basket size.
        </p>
      </div>
    </div>
  </div>
</div>

      {/* PRODUCT PERFORMANCE */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* TOP PRODUCT */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            🏆 Top Product
          </p>

          {topProduct ? (
            <>
              <h3 className="mt-3 text-lg font-extrabold">
                {topProduct.name}
              </h3>

              <p className="mt-2 text-sm text-[var(--muted)]">
                {topProduct.quantity} unit
                {topProduct.quantity === 1 ? "" : "s"} sold
              </p>

              <p className="mt-4 text-2xl font-extrabold text-[var(--primary)]">
                {formatCurrency(topProduct.revenue)}
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              No paid product sales yet.
            </p>
          )}
        </div>

        {/* BEST PERFORMERS */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            📊 Product Performance
          </p>

          <div className="mt-4 space-y-3">
            {productSales.slice(0, 3).map((product, index) => (
              <div
                key={product.name}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--agent-bg)] p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sage)] text-xs font-extrabold text-[var(--primary)]">
                    {index + 1}
                  </span>

                  <p className="truncate text-sm font-bold">
                    {product.name}
                  </p>
                </div>

                <p className="shrink-0 text-xs font-extrabold">
                  {formatCurrency(product.revenue)}
                </p>
              </div>
            ))}

            {!productSales.length && (
              <p className="text-sm text-[var(--muted)]">
                Sales data will appear here.
              </p>
            )}
          </div>
        </div>

        {/* AI GROWTH */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h3 className="font-extrabold">AI Growth Opportunity</h3>
          </div>

          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {topProduct
              ? `Your strongest product is ${topProduct.name}. Use the AI Agent to recommend complementary products when customers buy it.`
              : "Once customers start purchasing, AI will identify products with the strongest growth opportunities."}
          </p>

          <button
            onClick={() =>
              onOpenAgent(
                "Analyze my store performance and tell me the biggest opportunity to grow revenue."
              )
            }
            className="mt-4 w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
          >
            Ask AI Agent →
          </button>
        </div>
      </div>

      
            {/* REVENUE RECOVERY */}
      <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">💸</span>
              <h2 className="font-extrabold">
                AI Revenue Recovery
              </h2>

              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                OPPORTUNITY
              </span>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              {pendingPaymentOrders.length > 0
                ? `There are ${pendingPaymentOrders.length} payment ${
                    pendingPaymentOrders.length === 1
                      ? "attempt"
                      : "attempts"
                  } worth ${formatCurrency(
                    pendingPaymentValue,
                  )} that did not complete successfully.`
                : "No pending payment opportunities right now. Your successful payments are being tracked automatically."}
            </p>
          </div>

          {pendingPaymentOrders.length > 0 && (
            <button
              onClick={() =>
                onOpenAgent(
                  "Analyze my pending payments and recommend the safest revenue recovery action."
                )
              }
              className="shrink-0 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
            >
              Recover Revenue →
            </button>
          )}
        </div>

        {pendingPaymentOrders.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
              <p className="text-xs text-[var(--muted)]">
                At-risk orders
              </p>
              <p className="mt-1 text-xl font-extrabold">
                {pendingPaymentOrders.length}
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
              <p className="text-xs text-[var(--muted)]">
                Revenue at risk
              </p>
              <p className="mt-1 text-xl font-extrabold text-[var(--primary)]">
                {formatCurrency(pendingPaymentValue)}
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
              <p className="text-xs text-[var(--muted)]">
                Suggested action
              </p>
              <p className="mt-1 text-sm font-extrabold">
                AI recovery
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI AUDIT TRAIL */}
      <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg">🧾</span>
              <h2 className="font-extrabold">
                AI Agent Audit Trail
              </h2>

              <span className="rounded-full bg-[var(--sage)] px-2 py-1 text-[10px] font-bold text-[var(--primary)]">
                TRACEABLE
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Every revenue-related agent action is recorded with an
              explainable decision, safety boundary and execution status.
            </p>
          </div>

          <div className="rounded-xl bg-[var(--agent-bg)] px-4 py-2 text-xs font-bold text-[var(--muted)]">
            {auditLoading
              ? "Loading..."
              : `${auditLogs.length} recorded action${
                  auditLogs.length === 1 ? "" : "s"
                }`}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
            <p className="text-xs font-bold text-[var(--muted)]">
              🔍 Explainable
            </p>
            <p className="mt-2 text-sm font-extrabold">
              Decision logged
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Reason and action are recorded
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
            <p className="text-xs font-bold text-[var(--muted)]">
              🔒 Bounded
            </p>
            <p className="mt-2 text-sm font-extrabold">
              Safety limits
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Actions stay within defined bounds
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
            <p className="text-xs font-bold text-[var(--muted)]">
              ✅ Gated
            </p>
            <p className="mt-2 text-sm font-extrabold">
              Merchant confirmed
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Money actions require approval
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
            <p className="text-xs font-bold text-[var(--muted)]">
              🧪 Sandbox
            </p>
            <p className="mt-2 text-sm font-extrabold">
              Safe execution
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              No automatic customer charges
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)]">
          {auditLoading ? (
            <div className="p-5 text-sm text-[var(--muted)]">
              Loading agent activity...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-5 text-sm text-[var(--muted)]">
              No agent actions have been recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {auditLogs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="p-4 transition hover:bg-[var(--agent-bg)]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-[var(--sage)] px-2 py-1 text-[10px] font-extrabold text-[var(--primary)]">
                          {log.action.replaceAll("_", " ")}
                        </span>

                        {log.order_id && (
                          <span className="text-[10px] font-bold text-[var(--muted)]">
                            Order #{log.order_id}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                        {log.details || "Agent action recorded."}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] font-medium text-[var(--muted)]">
                      {new Date(log.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT ORDERS + QUICK ACTIONS */}
      <div className="mt-5 grid gap-5 pb-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold">Recent orders</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Live order activity
              </p>
            </div>

            <button
              onClick={onViewOrders}
              className="text-xs font-bold text-[var(--primary)]"
            >
              View all →
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                No orders yet.
              </div>
            ) : (
              orders.slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--sage)]">
                      📦
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        Order #{order.id}
                      </p>

                      <p className="truncate text-xs text-[var(--muted)]">
                        {order.items.length} item
                        {order.items.length === 1 ? "" : "s"} ·{" "}
                        {order.shipping_city}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-extrabold">
                      {formatCurrency(Number(order.subtotal))}
                    </p>

                    <div className="mt-1 flex justify-end gap-1.5">
  <span className="rounded-full bg-[var(--sage)] px-2 py-1 text-[10px] font-bold text-[var(--primary)]">
    {statusLabel(order.status)}
  </span>

  <span
    className={`rounded-full px-2 py-1 text-[10px] font-bold ${
      order.payment_status?.toLowerCase() === "paid"
        ? "bg-[var(--sage)] text-[var(--primary)]"
        : "bg-amber-100 text-amber-700"
    }`}
  >
    {order.payment_status?.toLowerCase() === "paid"
      ? "Paid"
      : "Payment Pending"}
  </span>
</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="font-extrabold">Quick actions</h2>

          <p className="mt-1 text-xs text-[var(--muted)]">
            Common merchant actions
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <QuickAction
              icon="📦"
              title="Orders"
              onClick={onViewOrders}
            />

            <QuickAction
              icon="✨"
              title="AI Agent"
              onClick={() => onOpenAgent()}
            />

            <QuickAction
              icon="📊"
              title="Analytics"
            />

            <QuickAction
              icon="🎯"
              title="Campaigns"
            />
          </div>

          <div className="mt-5 rounded-2xl bg-[var(--sage)] p-4">
            <p className="text-xs font-bold text-[var(--primary)]">
              💡 Store insight
            </p>

            <p className="mt-1 text-sm leading-5">
              {orders.length
                ? `You have ${orders.length} order${
                    orders.length === 1 ? "" : "s"
                  } generating ${formatCurrency(revenue)} in revenue.`
                : "Your store is ready. Start getting orders through AgentCart."}
            </p>
          </div>
        </div>
      </div>
            {/* MERCHANT ACTIONS */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <button
          onClick={() => onOpenAgent()}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--hover)]"
        >
          <div className="text-lg">✨</div>
          <p className="mt-2 text-sm font-extrabold">
            Ask AI Agent
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Analyze products, carts and customers
          </p>
        </button>

        <button
          onClick={onViewOrders}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--hover)]"
        >
          <div className="text-lg">📦</div>
          <p className="mt-2 text-sm font-extrabold">
            Manage Orders
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Review recent customer activity
          </p>
        </button>

        <button
          onClick={() =>
  onOpenAgent(
    "Analyze my sales and suggest the best upsell, cross-sell, and revenue recovery opportunities."
  )
}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--hover)]"
        >
          <div className="text-lg">📈</div>
          <p className="mt-2 text-sm font-extrabold">
            Grow Revenue
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Find upsell and cross-sell opportunities
          </p>
        </button>
      </div>
    </section>
  );
}

function getChartValues(orders: Order[]) {
  const values = orders
    .slice(0, 7)
    .map((order) => Number(order.subtotal || 0));

  while (values.length < 7) {
    values.unshift(0);
  }

  const max = Math.max(...values, 1);

  return values.map((value) => {
    if (value === 0) return 8;

    return Math.max(12, Math.round((value / max) * 100));
  });
}

function StatCard({
  icon,
  label,
  value,
  change,
}: {
  icon: string;
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--sage)] text-sm font-extrabold text-[var(--primary)]">
          {icon}
        </span>

        <span className="text-[10px] font-bold text-[var(--primary)]">
          {change}
        </span>
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">{label}</p>

      <p className="mt-1 text-xl font-extrabold">
        {value}
      </p>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  onClick,
}: {
  icon: string;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-4 text-left transition hover:-translate-y-0.5 hover:bg-[var(--hover)]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--sage)]">
        {icon}
      </span>

      <span className="text-sm font-bold">
        {title}
      </span>
    </button>
  );
}
