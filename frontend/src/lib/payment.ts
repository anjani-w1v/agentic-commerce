import { loadRazorpay } from "./razorpay";

const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

interface PaymentOrder {
  razorpay_key_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  order_id: number;
}

export async function startPayment(
  sessionId: string,
  orderId: number,
): Promise<void> {
  const loaded: boolean = await loadRazorpay();

  if (!loaded) {
    throw new Error(
      "Unable to load Razorpay Checkout",
    );
  }

  const response: Response = await fetch(
    `${API_URL}/api/payments/create-order`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        session_id: sessionId,
        order_id: orderId,
      }),
    },
  );

  if (!response.ok) {
    const errorText: string =
      await response.text();

    throw new Error(
      `Failed to create payment order: ${errorText}`,
    );
  }

  const paymentOrder: PaymentOrder =
    await response.json();

  console.log(
    "Razorpay order created:",
    paymentOrder,
  );

  const options: RazorpayOptions = {
    key: paymentOrder.razorpay_key_id,

    amount: paymentOrder.amount,

    currency: paymentOrder.currency,

    name: "AgentCart",

    description:
      `Payment for Order #${paymentOrder.order_id}`,

    order: paymentOrder.razorpay_order_id,

    handler: async (
      payment: RazorpayPaymentResponse,
    ): Promise<void> => {

      console.log(
        "========== RAZORPAY RESPONSE ==========",
      );

      console.log(
        "Payment ID:",
        payment.razorpay_payment_id,
      );

      console.log(
        "Order ID:",
        payment.razorpay_order_id,
      );

      console.log(
        "Signature:",
        payment.razorpay_signature,
      );

      console.log(
        "Full Response:",
        payment,
      );

      console.log(
        "========================================",
      );

      const verifyResponse: Response =
        await fetch(
          `${API_URL}/api/payments/verify`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              session_id: sessionId,

              order_id: orderId,

              razorpay_order_id:
                paymentOrder.razorpay_order_id,

              razorpay_payment_id:
                payment.razorpay_payment_id,

              razorpay_signature:
                payment.razorpay_signature,
            }),
          },
        );

      if (!verifyResponse.ok) {
        const errorText: string =
          await verifyResponse.text();

        console.error(
          "Payment verification error:",
          errorText,
        );

        throw new Error(
          `Payment verification failed: ${errorText}`,
        );
      }

      const result: unknown =
        await verifyResponse.json();

      console.log(
        "Payment successfully verified:",
        result,
      );

      window.location.href =
        `/payment-success?order_id=${orderId}`;
    },

    modal: {
      ondismiss: (): void => {
        console.log(
          "Customer closed payment window",
        );
      },
    },

    theme: {
      color: "#3399cc",
    },
  };

  const razorpay: RazorpayInstance =
    new window.Razorpay(options);

  razorpay.open();
}