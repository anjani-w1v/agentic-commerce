"use client";

import { useState } from "react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const SESSION_ID = "demo-user-001";

export default function GrowthPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [proposal, setProposal] = useState<any>(null);

  async function analyzeGrowth() {
    setLoading(true);
    setMessage("");
    setProposal(null);

    try {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: SESSION_ID,
          message: "Create a campaign to grow my sales",
        }),
      });

      if (!response.ok) {
        throw new Error("Growth analysis failed");
      }

      const data = await response.json();

      setMessage(data.message || "");
      setProposal(data);
    } catch (error) {
      console.error("Growth analysis failed:", error);
      setMessage(
        "Unable to analyze growth opportunities right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function executeCampaign() {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: SESSION_ID,
          message: "Yes, launch it",
        }),
      });

      if (!response.ok) {
        throw new Error("Campaign execution failed");
      }

      const data = await response.json();

      setMessage(data.message || "");
      setProposal(data);
    } catch (error) {
      console.error("Campaign execution failed:", error);
      setMessage(
        "Campaign execution could not be completed. No changes were made.",
      );
    } finally {
      setLoading(false);
    }
  }

  const executed =
    proposal?.intent === "campaign_executed" ||
    message.toLowerCase().includes("campaign approved");

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
            AI Revenue Growth
          </p>

          <h1 className="mt-1 text-3xl font-black">
            Grow Merchant Revenue
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Let the AI analyze sales signals and propose a bounded
            growth campaign. Execution always requires merchant approval.
          </p>
        </div>

        {/* HERO */}
        <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚀</span>

                <span className="rounded-full bg-[var(--sage)] px-3 py-1 text-[10px] font-black text-[var(--primary)]">
                  AI GROWTH ENGINE
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-black">
                Find the next revenue opportunity
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
                Analyze recent paid orders, identify the strongest
                product signal, and create a safe cross-sell campaign.
              </p>
            </div>

            <button
              onClick={analyzeGrowth}
              disabled={loading}
              className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Analyzing..."
                : "Analyze Growth Opportunity →"}
            </button>
          </div>
        </div>

        {/* SAFETY MODEL */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="text-xl">💡</div>
            <p className="mt-3 font-black">Explainable</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              The campaign is based on actual order and product signals.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="text-xl">🔒</div>
            <p className="mt-3 font-black">Bounded ≤ 10%</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Any campaign discount stays within the 10% safety limit.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="text-xl">✋</div>
            <p className="mt-3 font-black">Merchant Gated</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              AI proposes first. Nothing executes without confirmation.
            </p>
          </div>
        </div>

        {/* AI RESULT */}
        {(message || loading) && (
          <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h2 className="font-black">
                AI Growth Decision
              </h2>
            </div>

            {loading ? (
              <div className="mt-5 rounded-2xl bg-[var(--agent-bg)] p-6">
                <p className="text-sm text-[var(--muted)]">
                  AI is analyzing your sales signals...
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 whitespace-pre-line rounded-2xl bg-[var(--agent-bg)] p-5 text-sm leading-6">
                  {message}
                </div>

                {!executed &&
                  (
                    proposal?.intent === "campaign" ||
                    message.toLowerCase().includes("proposal only") ||
                    message.toLowerCase().includes("merchant confirmation")
                  ) && (
                    <button
                      onClick={executeCampaign}
                      disabled={loading}
                      className="mt-4 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-60"
                    >
                      Approve & Launch Sandbox Campaign →
                    </button>
                  )}

                {executed && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="font-black text-emerald-800">
                      ✓ Campaign executed safely
                    </p>

                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                      The action was executed in sandbox mode.
                      No customer payment was charged and no
                      product price was changed.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TRACK BAR */}
        <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="font-black">
            Growth Execution Model
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
              <span className="text-lg">①</span>
              <p className="mt-2 text-sm font-black">
                Detect
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Analyze paid-order signals.
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
              <span className="text-lg">②</span>
              <p className="mt-2 text-sm font-black">
                Recommend
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Select a revenue opportunity.
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
              <span className="text-lg">③</span>
              <p className="mt-2 text-sm font-black">
                Gate
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Require merchant approval.
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
              <span className="text-lg">④</span>
              <p className="mt-2 text-sm font-black">
                Execute
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Execute safely in sandbox.
              </p>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Link
            href="/merchant/recovery"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5"
          >
            <p className="font-black">💸 Revenue Recovery</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Recover pending payment opportunities.
            </p>
          </Link>

          <Link
            href="/merchant/orders"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5"
          >
            <p className="font-black">📦 Orders</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Inspect order and payment history.
            </p>
          </Link>

          <Link
            href="/merchant/audit"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5"
          >
            <p className="font-black">🧾 Audit Trail</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Review every gated AI action.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
