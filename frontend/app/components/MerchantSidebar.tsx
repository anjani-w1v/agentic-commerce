"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MerchantSidebar() {
  const pathname = usePathname();

  const links = [
    {
      href: "/merchant",
      label: "Overview",
      icon: "🏠",
    },
    {
      href: "/",
      label: "AI Commerce",
      icon: "🤖",
    },
    {
      href: "/merchant/growth",
      label: "Revenue Growth",
      icon: "📈",
    },
    {
      href: "/merchant/recovery",
      label: "Revenue Recovery",
      icon: "💸",
    },
    {
      href: "/merchant/orders",
      label: "Orders",
      icon: "📦",
    },
    {
      href: "/merchant/audit",
      label: "Audit Trail",
      icon: "🧾",
    },
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-5 lg:flex lg:min-h-screen lg:flex-col">
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
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "flex items-center gap-3 rounded-xl bg-[var(--sage)] px-4 py-3 text-sm font-bold text-[var(--primary)]"
                  : "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--agent-bg)]"
              }
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-10">
        <div className="rounded-2xl bg-[var(--agent-bg)] p-4">
          <p className="text-xs font-extrabold">
            🛍️ Customer Store
          </p>

          <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
            You are viewing the AI-powered shopping experience.
          </p>

          <p className="mt-3 text-xs font-bold text-[var(--primary)]">
            AI Commerce Active ✓
          </p>
        </div>
      </div>
    </aside>
  );
}
