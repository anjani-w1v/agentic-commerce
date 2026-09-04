"use client";

import Link from "next/link";
import MerchantDashboard from "../components/MerchantDashboard";

export default function MerchantPage() {
  return (
    <main className="theme-light min-h-screen bg-[var(--bg)]">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        {/* SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-5 lg:block">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-black text-white">
              A
            </div>

            <div>
              <p className="font-black">AgentCart</p>
              <p className="text-[10px] font-semibold text-[var(--muted)]">
                MERCHANT CONSOLE
              </p>
            </div>
          </Link>

          <nav className="mt-8 space-y-2">
            <Link
              href="/merchant"
              className="flex items-center gap-3 rounded-xl bg-[var(--sage)] px-4 py-3 text-sm font-bold text-[var(--primary)]"
            >
              <span>🏠</span>
              Overview
            </Link>

            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--agent-bg)]"
            >
              <span>🤖</span>
              AI Commerce
            </Link>

            <Link
              href="/merchant/growth"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--agent-bg)]"
            >
              <span>📈</span>
              Revenue Growth
            </Link>

            <Link
              href="/merchant/recovery"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--agent-bg)]"
            >
              <span>💸</span>
              Revenue Recovery
            </Link>

            <Link
              href="/merchant/orders"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--agent-bg)]"
            >
              <span>📦</span>
              Orders
            </Link>

            <Link
              href="/merchant/audit"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--agent-bg)]"
            >
              <span>🧾</span>
              Audit Trail
            </Link>
          </nav>

          <div className="mt-auto pt-10">
            <Link
              href="/"
              className="block rounded-2xl bg-[var(--agent-bg)] p-4"
            >
              <p className="text-xs font-extrabold">🛍️ Customer Store</p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
                Open the AI shopping experience
              </p>
              <p className="mt-3 text-xs font-bold text-[var(--primary)]">
                Open Store →
              </p>
            </Link>
          </div>
        </aside>

        {/* MAIN */}
        <section className="min-w-0 flex-1">
          {/* MOBILE HEADER */}
          <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 lg:hidden">
            <div className="flex items-center justify-between">
              <Link href="/" className="font-black">
                AgentCart
              </Link>

              <Link
                href="/"
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white"
              >
                AI Store →
              </Link>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto">
              <Link
                href="/merchant"
                className="whitespace-nowrap rounded-lg bg-[var(--sage)] px-3 py-2 text-xs font-bold text-[var(--primary)]"
              >
                Overview
              </Link>
              <Link
                href="/merchant/growth"
                className="whitespace-nowrap rounded-lg bg-[var(--agent-bg)] px-3 py-2 text-xs font-semibold"
              >
                Growth
              </Link>
              <Link
                href="/merchant/recovery"
                className="whitespace-nowrap rounded-lg bg-[var(--agent-bg)] px-3 py-2 text-xs font-semibold"
              >
                Recovery
              </Link>
              <Link
                href="/merchant/orders"
                className="whitespace-nowrap rounded-lg bg-[var(--agent-bg)] px-3 py-2 text-xs font-semibold"
              >
                Orders
              </Link>
              <Link
                href="/merchant/audit"
                className="whitespace-nowrap rounded-lg bg-[var(--agent-bg)] px-3 py-2 text-xs font-semibold"
              >
                Audit
              </Link>
            </div>
          </div>

          {/* PAGE HEADER */}
          <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-8">
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                Merchant Console
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                Business Overview
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Monitor revenue, understand AI-driven opportunities and
                control every money-moving action.
              </p>
            </div>
          </div>

          {/* EXISTING REAL DASHBOARD */}
          <div className="px-2 pb-10 sm:px-4">
            <MerchantDashboard
              darkMode={false}
              onOpenAgent={() => {
                window.location.href = "/";
              }}
              onViewOrders={() => {
                window.location.href = "/merchant/orders";
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
