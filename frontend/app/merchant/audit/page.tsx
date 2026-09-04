"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const SESSION_ID = "demo-user-001";

type AuditLog = {
  id: number;
  session_id: string;
  action: string;
  details: string | null;
  order_id: number | null;
  created_at: string;
};

function actionLabel(action: string) {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actionIcon(action: string) {
  if (action.includes("PAYMENT")) return "💳";
  if (action.includes("CAMPAIGN")) return "🎯";
  if (action.includes("RECOVERY")) return "💸";
  if (action.includes("ORDER")) return "📦";
  return "🤖";
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllLogs, setShowAllLogs] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          `${API_URL}/api/audit/${SESSION_ID}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Failed to load audit logs");
        }

        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Audit loading failed:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const paymentActions = useMemo(
    () =>
      logs.filter((log) =>
        log.action.includes("PAYMENT"),
      ).length,
    [logs],
  );

  const growthActions = useMemo(
    () =>
      logs.filter(
        (log) =>
          log.action.includes("CAMPAIGN") ||
          log.action.includes("RECOVERY"),
      ).length,
    [logs],
  );

  const visibleLogs = showAllLogs ? logs : logs.slice(0, 5);

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
            Governance & Safety
          </p>

          <h1 className="mt-1 text-3xl font-black">
            AI Agent Audit Trail
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Every important AI and payment action is recorded so
            decisions remain explainable, bounded and traceable.
          </p>
        </div>

        {/* SAFETY MODEL */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="text-xl">💡</div>
            <p className="mt-3 font-black">Explainable</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              AI decisions include a recorded reason.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="text-xl">🔒</div>
            <p className="mt-3 font-black">Bounded</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Money actions stay inside safety limits.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="text-xl">✋</div>
            <p className="mt-3 font-black">Gated</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Merchant confirmation is required before execution.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="text-xl">🧪</div>
            <p className="mt-3 font-black">Sandbox</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Growth actions execute safely without changing real prices.
            </p>
          </div>
        </div>

        {/* STATS */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">
              Total Events
            </p>
            <p className="mt-2 text-2xl font-black">
              {loading ? "..." : logs.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">
              Payment Events
            </p>
            <p className="mt-2 text-2xl font-black">
              {loading ? "..." : paymentActions}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">
              Growth / Recovery
            </p>
            <p className="mt-2 text-2xl font-black">
              {loading ? "..." : growthActions}
            </p>
          </div>
        </div>

        {/* SAFETY DECISION SUMMARY */}
        {!loading && logs.length > 0 && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--agent-bg)] text-xl">
                  🔒
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                    Latest Safety Decision
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    Unsafe recovery blocked
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    The AI refused to execute a recovery action because
                    revenue at risk exceeded the ₹100,000 safety bound.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    At Risk
                  </p>
                  <p className="mt-1 text-xl font-black">
                    ₹1,86,039
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Safety Bound
                  </p>
                  <p className="mt-1 text-xl font-black">
                    ₹1,00,000
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[var(--agent-bg)] p-4 text-xs leading-5 text-[var(--muted)]">
                <span className="font-black text-[var(--primary)]">
                  Result:
                </span>{" "}
                Merchant confirmation cannot override the safety policy.
                No customer was charged.
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--agent-bg)] text-xl">
                  🧪
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                    Safe Execution
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    Sandbox actions are gated
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Growth and recovery workflows require explicit
                    merchant confirmation before execution.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between rounded-2xl bg-[var(--agent-bg)] px-4 py-3">
                  <span className="text-xs font-bold">
                    Merchant confirmation
                  </span>
                  <span className="text-xs font-black text-[var(--primary)]">
                    REQUIRED
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-[var(--agent-bg)] px-4 py-3">
                  <span className="text-xs font-bold">
                    Money actions
                  </span>
                  <span className="text-xs font-black text-[var(--primary)]">
                    BOUNDED
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-[var(--agent-bg)] px-4 py-3">
                  <span className="text-xs font-bold">
                    Price changes
                  </span>
                  <span className="text-xs font-black text-[var(--primary)]">
                    SANDBOX ONLY
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-[var(--agent-bg)] px-4 py-3">
                  <span className="text-xs font-bold">
                    Audit logging
                  </span>
                  <span className="text-xs font-black text-[var(--primary)]">
                    ENABLED
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EVENT TIMELINE */}
        <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black">
                Decision Timeline
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Latest agent and payment events
              </p>
            </div>

            <span className="rounded-full bg-[var(--sage)] px-3 py-1 text-[10px] font-bold text-[var(--primary)]">
              LIVE LOG
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="py-10 text-center text-sm text-[var(--muted)]">
                Loading audit trail...
              </div>
            ) : logs.length === 0 ? (
              <div className="rounded-2xl bg-[var(--agent-bg)] p-8 text-center">
                <div className="text-3xl">🧾</div>
                <p className="mt-3 font-bold">
                  No audit events yet
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Agent activity will appear here.
                </p>
              </div>
            ) : (
              visibleLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--agent-bg)] p-4"
                >
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-lg">
                      {actionIcon(log.action)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black">
                          {actionLabel(log.action)}
                        </p>

                        {log.order_id && (
                          <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-[9px] font-bold text-[var(--muted)]">
                            Order #{log.order_id}
                          </span>
                        )}
                      </div>

                      {log.details && (
                        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                          {log.details}
                        </p>
                      )}

                      <p className="mt-2 text-[10px] font-semibold text-[var(--muted)]">
                        {new Date(log.created_at).toLocaleString(
                          "en-IN",
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {logs.length > 5 && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllLogs((current) => !current)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-xs font-black transition hover:bg-[var(--agent-bg)]"
              >
                {showAllLogs
                  ? "Show less ↑"
                  : `See more · ${logs.length - 5} more events ↓`}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
