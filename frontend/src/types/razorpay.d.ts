interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order: string;

  handler: (
    response: RazorpayPaymentResponse,
  ) => void | Promise<void>;

  modal?: {
    ondismiss?: () => void;
  };

  theme?: {
    color?: string;
  };
}

interface RazorpayInstance {
  open: () => void;
}

interface Window {
  Razorpay: new (
    options: RazorpayOptions,
  ) => RazorpayInstance;
}