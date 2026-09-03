"use client";

import {
  Suspense,
  useEffect,
} from "react";
import { useSearchParams } from "next/navigation";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();

  const orderId = searchParams.get("order_id");

  useEffect(() => {
    console.log(
      "Payment successful for order:",
      orderId
    );
  }, [orderId]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "white",
          borderRadius: "24px",
          padding: "40px",
          textAlign: "center",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "#dcfce7",
            color: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "42px",
            margin: "0 auto 24px",
          }}
        >
          ✓
        </div>

        <h1
          style={{
            fontSize: "32px",
            fontWeight: "700",
            marginBottom: "12px",
            color: "#111827",
          }}
        >
          Payment Successful 🎉
        </h1>

        <p
          style={{
            color: "#475569",
            fontSize: "16px",
            marginBottom: "28px",
          }}
        >
          Your payment has been completed
          successfully.
        </p>

        <div
          style={{
            background: "#f8fafc",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "28px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#475569",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            Order ID
          </p>

          <p
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: "700",
              color: "#111827",
            }}
          >
            #{orderId || "—"}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            style={{
              border: "none",
              borderRadius: "12px",
              padding: "14px 22px",
              background: "#111827",
              color: "white",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Continue Shopping
          </button>

          <button
            onClick={() => {
              window.location.href =
                `/order?order_id=${orderId}`;
            }}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 22px",
              background: "white",
              color: "#111827",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            View Order
          </button>
        </div>
      </div>
    </main>
  );
}

function LoadingPaymentSuccess() {
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
      Loading payment...
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={<LoadingPaymentSuccess />}
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}