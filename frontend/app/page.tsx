"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const SESSION_ID = "demo-user-001";

type Variant = {
  id: number;
  sku: string;
  price: number;
  currency: string;
  color: string | null;
  size: string | null;
  stock: number;
};

type Product = {
  id: number;
  merchant_id: number;
  name: string;
  description: string | null;
  category: string;
  brand: string | null;
  image_url: string | null;
  rating: number | null;
  is_active: boolean;
  variants: Variant[];
};

type CartItem = {
  id: number;
  variant_id: number;
  product_name: string;
  color: string | null;
  size: string | null;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Cart = {
  id: number;
  session_id: string;
  items: CartItem[];
  subtotal: number;
};

type AgentProduct = {
  product_id: number;
  variant_id: number;
  name: string;
  brand: string | null;
  category: string;
  price: number;
  currency: string;
  image_url: string | null;
  stock: number;
};

type AgentMessage = {
  role: "agent" | "user";
  text: string;
  products?: AgentProduct[];
};

const categories = [
  { name: "All", icon: "▦" },
  { name: "Running Shoes", icon: "👟" },
  { name: "Sneakers", icon: "👟" },
  { name: "Hoodies", icon: "🧥" },
  { name: "Jeans", icon: "👖" },
  { name: "Headphones", icon: "🎧" },
  { name: "Backpacks", icon: "🎒" },
  { name: "Deals", icon: "🔥" },
];

export default function Home() {
  const [darkMode, setDarkMode] =
    useState(false);

  const [agentOpen, setAgentOpen] =
    useState(false);

  const [cartOpen, setCartOpen] =
    useState(false);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [cart, setCart] =
    useState<Cart | null>(null);

  const [search, setSearch] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [loadingCart, setLoadingCart] =
    useState(true);

  const [agentLoading, setAgentLoading] =
    useState(false);

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [agentMessages, setAgentMessages] =
    useState<AgentMessage[]>([
      {
        role: "agent",
        text:
          "Hi! 👋 I'm AgentCart. Tell me what you want to buy and I'll find the best options for you.",
      },
    ]);

  /* ================================================= */
  /* LOAD PRODUCTS */
  /* ================================================= */

  function speakAgentReply(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const cleanText = text
    .replace(/[*#_`]/g, "")
    .replace(/₹/g, "rupees ");

  const utterance = new SpeechSynthesisUtterance(cleanText);

  utterance.lang = "en-IN";
  utterance.rate = 0.95;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}

  function startVoiceInput() {
  if (typeof window === "undefined") return;

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice input is not supported in this browser.");
    return;
  }

  // Stop any agent speech immediately when user starts speaking
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  // Stop previous recognition instance if one exists
  if (recognitionRef.current) {
    try {
      recognitionRef.current.stop();
    } catch {}
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    setIsListening(true);

    // Double safety: stop agent voice once microphone starts
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript.trim();

    console.log("VOICE TRANSCRIPT:", transcript);

    const lower = transcript.toLowerCase().trim();

    // Local voice command — DO NOT send "stop" to the AI
    const stopCommands = [
      "stop",
      "stop speaking",
      "be quiet",
      "quiet",
      "chup",
      "chup karo",
      "bas",
      "bas karo",
      "ruk jao",
      "ruko",
    ];

    if (stopCommands.includes(lower)) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      setIsListening(false);
      setMessage("");
      return;
    }

    setMessage(transcript);

    setTimeout(() => {
      sendAgentMessage(transcript);
    }, 100);
  };

  recognition.onerror = (event: any) => {
    console.log("VOICE ERROR:", event.error);
    setIsListening(false);
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  recognitionRef.current = recognition;

  recognition.start();
}

  async function loadProducts() {
    try {
      setLoadingProducts(true);
      setError("");

      const params =
        new URLSearchParams();

      if (search.trim()) {
        params.set(
          "search",
          search.trim(),
        );
      }

      if (
        selectedCategory !== "All" &&
        selectedCategory !== "Deals"
      ) {
        params.set(
          "category",
          selectedCategory,
        );
      }

      const response =
        await fetch(
          `${API_URL}/api/products/?${params.toString()}`,
        );

      if (!response.ok) {
        throw new Error(
          "Failed to load products",
        );
      }

      const data: Product[] =
        await response.json();

      setProducts(data);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load products. Make sure the backend is running.",
      );
    } finally {
      setLoadingProducts(false);
    }
  }

  /* ================================================= */
  /* LOAD CART */
  /* ================================================= */

  async function loadCart(): Promise<Cart | null> {
  try {
    setLoadingCart(true);

    const response = await fetch(
      `${API_URL}/api/cart/${SESSION_ID}`,
    );

    if (!response.ok) {
      throw new Error(
        "Failed to load cart",
      );
    }

    const data: Cart =
      await response.json();

    setCart(data);

    return data;
  } catch (err) {
    console.error(err);

    return null;
  } finally {
    setLoadingCart(false);
  }
}

  /* ================================================= */
  /* INITIAL LOAD */
  /* ================================================= */

  useEffect(() => {
    loadProducts();
  }, [
    search,
    selectedCategory,
  ]);

  useEffect(() => {
    loadCart();
  }, []);

  /* ================================================= */
  /* ADD NORMAL PRODUCT TO CART */
  /* ================================================= */

  async function addToCart(
    product: Product,
  ) {
    const variant =
      product.variants.find(
        (item) => item.stock > 0,
      );

    if (!variant) {
      alert(
        "This product is currently out of stock.",
      );

      return;
    }

    await addVariantToCart(
      variant.id,
    );
  }

  /* ================================================= */
  /* ADD AGENT PRODUCT TO CART */
  /* ================================================= */

  async function addVariantToCart(
  variantId: number,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_URL}/api/cart/items`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: SESSION_ID,
          variant_id: variantId,
          quantity: 1,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "ADD TO CART ERROR:",
        errorText,
      );

      return false;
    }

    await loadCart();

    return true;
  } catch (err) {
    console.error(
      "ADD TO CART ERROR:",
      err,
    );

    return false;
  }
}

  /* ================================================= */
  /* REMOVE FROM CART */
  /* ================================================= */

  async function removeFromCart(
    itemId: number,
  ) {
    try {
      const response =
        await fetch(
          `${API_URL}/api/cart/items/${itemId}?session_id=${SESSION_ID}`,
          {
            method: "DELETE",
          },
        );

      if (!response.ok) {
        throw new Error(
          "Failed to remove item",
        );
      }

      const updatedCart: Cart =
        await response.json();

      setCart(updatedCart);
    } catch (err) {
      console.error(err);

      alert(
        "Could not remove item.",
      );
    }
  }

  /* ================================================= */
  /* UPDATE CART QUANTITY */
  /* ================================================= */

  async function updateQuantity(
    itemId: number,
    quantity: number,
  ) {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    try {
      const response =
        await fetch(
          `${API_URL}/api/cart/items/${itemId}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              session_id:
                SESSION_ID,

              quantity,
            }),
          },
        );

      if (!response.ok) {
        throw new Error(
          "Failed to update cart",
        );
      }

      const updatedCart: Cart =
        await response.json();

      setCart(updatedCart);
    } catch (err) {
      console.error(err);

      alert(
        "Could not update quantity.",
      );
    }
  }


  

  /* ================================================= */
  /* RAZORPAY CHECKOUT */
  /* ================================================= */

  async function startRazorpayCheckout() {
    if (paymentLoading) {
      return;
    }

    setPaymentLoading(true);

    try {
      // 1. Get the latest cart
      const currentCart = await loadCart();

      if (
        !currentCart ||
        currentCart.items.length === 0
      ) {
        alert("Your cart is empty.");
        return;
      }

      // 2. Get the saved default address
      const addressResponse = await fetch(
        `${API_URL}/api/addresses/${SESSION_ID}/default`,
      );

      if (!addressResponse.ok) {
        const errorData =
          await addressResponse.json().catch(() => null);

        throw new Error(
          errorData?.detail ||
            "No default delivery address found.",
        );
      }

      const address =
        await addressResponse.json();

      // 3. Create AgentCart order
      const orderResponse = await fetch(
        `${API_URL}/api/orders/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: SESSION_ID,
            address_id: address.id,
          }),
        },
      );

      if (!orderResponse.ok) {
        const errorData =
          await orderResponse.json().catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to create order.",
        );
      }

      const order =
        await orderResponse.json();

      // 4. Create Razorpay order
      const paymentOrderResponse =
        await fetch(
          `${API_URL}/api/payments/create-order`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              session_id: SESSION_ID,
              order_id: order.id,
            }),
          },
        );

      if (!paymentOrderResponse.ok) {
        const errorData =
          await paymentOrderResponse
            .json()
            .catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to create Razorpay order.",
        );
      }

      const paymentOrder =
        await paymentOrderResponse.json();

      // 5. Load Razorpay Checkout SDK
      if (!(window as any).Razorpay) {
        await new Promise<void>(
          (resolve, reject) => {
            const script =
              document.createElement(
                "script",
              );

            script.src =
              "https://checkout.razorpay.com/v1/checkout.js";

            script.onload = () =>
              resolve();

            script.onerror = () =>
              reject(
                new Error(
                  "Failed to load Razorpay Checkout.",
                ),
              );

            document.body.appendChild(
              script,
            );
          },
        );
      }

      // 6. Open Razorpay checkout
      const options = {
        key: paymentOrder.razorpay_key_id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "AgentCart",
        description: `Order #${order.id}`,
        order_id:
          paymentOrder.razorpay_order_id,

        prefill: {
          name: address.full_name,
          contact: address.phone,
        },

        notes: {
          agentcart_order_id: String(
            order.id,
          ),
        },

        theme: {
          color: "#2563eb",
        },

        handler: async (
          response: any,
        ) => {
          try {
            // 7. Verify payment signature
            const verifyResponse =
              await fetch(
                `${API_URL}/api/payments/verify`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    session_id:
                      SESSION_ID,
                    order_id:
                      order.id,
                    razorpay_order_id:
                      response.razorpay_order_id,
                    razorpay_payment_id:
                      response.razorpay_payment_id,
                    razorpay_signature:
                      response.razorpay_signature,
                  }),
                },
              );

            const verifyData =
              await verifyResponse
                .json()
                .catch(() => null);

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData?.detail ||
                  "Payment verification failed.",
              );
            }

            // 8. Refresh cart after successful payment
            await loadCart();

            setCartOpen(false);

            setAgentMessages(
              (current) => [
                ...current,
                {
                  role: "agent",
                  text:
                    `Payment successful! 🎉 Order #${verifyData.order_id} is confirmed. Your payment has been verified securely.`,
                },
              ],
            );

            setAgentOpen(true);

            alert(
              `Payment successful! Order #${verifyData.order_id}`,
            );
          } catch (error: any) {
            console.error(
              "Payment verification error:",
              error,
            );

            alert(
              error?.message ||
                "Payment verification failed.",
            );
          } finally {
            setPaymentLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
          },
        },
      };

      const razorpay =
        new (window as any).Razorpay(
          options,
        );

      razorpay.open();
    } catch (error: any) {
      console.error(
        "CHECKOUT ERROR:",
        error,
      );

      alert(
        error?.message ||
          "Something went wrong during checkout.",
      );

      setPaymentLoading(false);
    }
  }

  /* ================================================= */
  /* REAL AGENT */
  /* ================================================= */

  async function sendAgentMessage(messageOverride?: string) {
      // Stop any previous agent speech when a new user message is sent
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  const text = (messageOverride ?? message).trim();
  if (!text) return;

  // Show user's message immediately
  setAgentMessages((current) => [
    ...current,
    {
      role: "user",
      text,
    },
  ]);

  setMessage("");
  setAgentLoading(true);

  try {
    const response = await fetch(
      `${API_URL}/api/agent/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: SESSION_ID,
          message: text,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        errorText || "Agent request failed",
      );
    }

    const data: {
      message: string;
      products: AgentProduct[];
      intent: string;
    } = await response.json();

    if (data.message) {
  speakAgentReply(data.message);
}

    console.log("AGENT RESPONSE:", data);

    // ==========================================
    // ADD TO CART
    // ==========================================

    if (data.intent === "add_to_cart") {
  await loadCart();

  setAgentMessages((current) => [
    ...current,
    {
      role: "agent",
      text: data.message,
      products: data.products,
    },
  ]);

  return;
}
      

    // ==========================================
    // REMOVE FROM CART
    // ==========================================

    if (
      data.intent === "remove_from_cart"
    ) {
      await loadCart();

      setAgentMessages((current) => [
        ...current,
        {
          role: "agent",
          text: data.message,
        },
      ]);

      return;
    }

    // ==========================================
    // SHOW CART
    // ==========================================

    if (
      data.intent === "show_cart"
    ) {
      const currentCart = await loadCart();

      setCartOpen(true);

      if (
        currentCart &&
        currentCart.items.length > 0
      ) {
        setAgentMessages((current) => [
          ...current,
          {
            role: "agent",
            text:
              "Here is your current cart. 🛒",
          },
        ]);
      } else {
        setAgentMessages((current) => [
          ...current,
          {
            role: "agent",
            text:
              "Your cart is currently empty. 🛒",
          },
        ]);
      }

      return;
    }

    // ==========================================
    // UPDATE QUANTITY
    // ==========================================

    if (
      data.intent === "update_quantity"
    ) {
      await loadCart();

      setAgentMessages((current) => [
        ...current,
        {
          role: "agent",
          text: data.message,
        },
      ]);

      return;
    }

    // ==========================================
    // CHECKOUT
    // ==========================================

    if (
      data.intent === "checkout"
    ) {
      setAgentMessages((current) => [
        ...current,
        {
          role: "agent",
          text:
            "Let's proceed to secure checkout. 💳",
        },
      ]);

      await startRazorpayCheckout();

      return;
    }

    // ==========================================
    // NORMAL SEARCH
    // ==========================================

    setAgentMessages((current) => [
      ...current,
      {
        role: "agent",
        text: data.message,
        products: data.products,
      },
    ]);
  } catch (err) {
    console.error("AGENT ERROR:", err);

    setAgentMessages((current) => [
      ...current,
      {
        role: "agent",
        text:
          "Sorry, I couldn't connect to the shopping agent. Please make sure the backend is running.",
      },
    ]);
  } finally {
    setAgentLoading(false);
  }
}

  /* ================================================= */
  /* DEAL PRODUCTS */
  /* ================================================= */

  const dealProducts =
    useMemo(() => {
      return products.filter(
        (product) =>
          product.variants.length >
          0,
      );
    }, [products]);

  /* ================================================= */
  /* CART COUNT */
  /* ================================================= */

  const cartCount =
    cart?.items.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    ) || 0;

  /* ================================================= */
  /* UI */
  /* ================================================= */

  return (
    <main
      className={
        darkMode
          ? "theme-dark min-h-screen"
          : "theme-light min-h-screen"
      }
    >
      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--header)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">

          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="flex shrink-0 items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-xl text-white shadow-md">
              🛒
            </div>

            <div className="hidden sm:block">
              <div className="text-lg font-extrabold">
                AgentCart
              </div>

              <div className="text-[10px] text-[var(--muted)]">
                AI powered shopping
              </div>
            </div>
          </button>

          {/* SEARCH */}

          <div className="mx-2 flex flex-1">
            <div className="flex w-full items-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--search-bg)]">

              <span className="pl-4 text-lg text-[var(--muted)]">
                🔍
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search products, brands and more..."
                className="w-full bg-transparent px-3 py-3 text-sm outline-none placeholder:text-[var(--muted)]"
              />

              <button
                onClick={
                  loadProducts
                }
                className="hidden bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)] sm:block"
              >
                Search
              </button>
            </div>
          </div>

          {/* LOCATION */}

          <button className="hidden text-left lg:block">
            <div className="text-[10px] text-[var(--muted)]">
              Deliver to
            </div>

            <div className="text-sm font-bold">
              📍 Ludhiana
            </div>
          </button>

          {/* ACCOUNT */}

          <button className="hidden text-left md:block">
            <div className="text-[10px] text-[var(--muted)]">
              Hello
            </div>

            <div className="text-sm font-bold">
              Account
            </div>
          </button>

          {/* CART */}

          <button
            onClick={() =>
              setCartOpen(true)
            }
            className="relative flex items-center gap-1 rounded-xl px-2 py-2 transition hover:bg-[var(--hover)]"
          >
            <span className="text-xl">
              🛒
            </span>

            <span className="hidden text-sm font-semibold sm:inline">
              Cart
            </span>

            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>

          {/* THEME */}

          <button
            onClick={() =>
              setDarkMode(
                !darkMode,
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] transition hover:scale-105"
          >
            {darkMode
              ? "☀️"
              : "🌙"}
          </button>
        </div>
      </header>

      {/* CATEGORY BAR */}

      <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">

          {categories.map(
            (category) => (
              <button
                key={
                  category.name
                }
                onClick={() =>
                  setSelectedCategory(
                    category.name,
                  )
                }
                className={
                  selectedCategory ===
                  category.name
                    ? "whitespace-nowrap rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm"
                    : "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]"
                }
              >
                {
                  category.icon
                }{" "}
                {
                  category.name
                }
              </button>
            ),
          )}
        </div>
      </nav>

      {/* MAIN */}

      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* HERO */}

        <section className="pt-6">
          <div className="relative overflow-hidden rounded-3xl bg-[var(--hero)] p-7 text-white shadow-lg sm:p-10">

            <div className="relative z-10 max-w-2xl">

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                ✨ AI-powered shopping
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                Shop smarter.
                <br />
                Let your agent do the work.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                Browse products yourself
                or ask AgentCart to search,
                compare, recommend, add
                to cart and help you
                checkout.
              </p>

              <button
                onClick={() =>
                  setAgentOpen(true)
                }
                className="mt-6 rounded-xl bg-[var(--mint)] px-5 py-3 text-sm font-bold text-[var(--deep)] shadow-lg transition hover:-translate-y-0.5 hover:bg-white"
              >
                ✨ Ask AgentCart
              </button>
            </div>

            <div className="absolute -right-10 -top-20 text-[220px] opacity-10">
              🛒
            </div>
          </div>
        </section>

        {/* AI BAR */}

        <section className="pt-6">
          <button
            onClick={() =>
              setAgentOpen(true)
            }
            className="flex w-full items-center justify-between rounded-2xl border border-[var(--agent-border)] bg-[var(--agent-bg)] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-4">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-md">
                ✨
              </div>

              <div>
                <div className="text-sm font-bold">
                  Ask AgentCart to shop
                  for you
                </div>

                <div className="mt-1 text-xs text-[var(--muted)]">
                  Try: "Find shoes under ₹5000"
                </div>
              </div>
            </div>

            <span className="text-xl text-[var(--primary)]">
              →
            </span>
          </button>
        </section>

        {/* PRODUCTS */}

        <section className="py-10">

          <div className="mb-5 flex items-end justify-between">

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                {selectedCategory ===
                "All"
                  ? "Explore"
                  : selectedCategory}
              </p>

              <h2 className="mt-1 text-2xl font-extrabold">
                {selectedCategory ===
                "Deals"
                  ? "Today's Deals 🔥"
                  : "Products for you"}
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                {products.length}{" "}
                products available
              </p>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {error}

              <button
                onClick={
                  loadProducts
                }
                className="ml-3 font-bold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* LOADING */}

          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-80 animate-pulse rounded-2xl bg-[var(--product-bg)]"
                  />
                ),
              )}
            </div>
          ) : (
            <ProductGrid
              products={
                selectedCategory ===
                "Deals"
                  ? dealProducts
                  : products
              }
              onAdd={
                addToCart
              }
            />
          )}
        </section>
      </div>

      {/* FLOATING AGENT */}

      {!agentOpen && (
        <button
          onClick={() =>
            setAgentOpen(true)
          }
          className="fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-2xl bg-[var(--primary)] px-5 py-4 text-sm font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-[var(--primary-dark)]"
        >
          ✨ Ask AgentCart
        </button>
      )}

      {/* AGENT DRAWER */}

      {agentOpen && (
        <div className="fixed inset-0 z-50">

          <div
            onClick={() =>
              setAgentOpen(false)
            }
            className="absolute inset-0 bg-[var(--deep)]/60 backdrop-blur-sm"
          />

          <aside className="agent-drawer absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
                  ✨
                </div>

                <div>
                  <div className="font-bold">
                    AgentCart
                  </div>

                  <div className="text-xs text-green-600">
                    ● Shopping Agent Online
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  setAgentOpen(
                    false,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--hover)] text-xl"
              >
                ×
              </button>
            </div>

            {/* MESSAGES */}

            <div className="flex-1 space-y-4 overflow-y-auto p-5">

              {agentMessages.map(
                (
                  item,
                  index,
                ) => (

                  <div
                    key={index}
                    className={
                      item.role ===
                      "user"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >

                    <div className="max-w-[92%]">

                      <div className="flex items-end gap-2">
  <div
    className={
      item.role ===
      "user"
        ? "rounded-2xl rounded-br-md bg-[var(--primary)] px-4 py-3 text-sm text-white"
        : "rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--agent-bg)] px-4 py-3 text-sm leading-6"
    }
  >
    {item.text}
  </div>

  {item.role !== "user" && (
    <button
      type="button"
      onClick={() => speakAgentReply(item.text)}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--hover)] transition"
      title="Listen to this response"
    >
      🔊
    </button>
  )}
</div>

                      {/* AGENT PRODUCT RESULTS */}

                      {item.products &&
                        item.products.length >
                          0 && (

                          <div className="mt-3 space-y-3">

                            {item.products.map(
                              (
                                product,
                              ) => (

                                <div
                                  key={`${product.product_id}-${product.variant_id}`}
                                  className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
                                >

                                  <div className="flex gap-3 p-3">

                                    {/* IMAGE */}

                                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--product-bg)]">

                                      {product.image_url ? (
                                        <img
                                          src={
                                            product.image_url
                                          }
                                          alt={
                                            product.name
                                          }
                                          className="h-full w-full object-contain p-2"
                                        />
                                      ) : (
                                        <span className="text-3xl">
                                          🛍️
                                        </span>
                                      )}

                                    </div>

                                    {/* INFO */}

                                    <div className="min-w-0 flex-1">

                                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                                        {
                                          product.category
                                        }
                                      </div>

                                      <div className="truncate text-sm font-bold">
                                        {
                                          product.name
                                        }
                                      </div>

                                      {product.brand && (
                                        <div className="text-xs text-[var(--muted)]">
                                          {
                                            product.brand
                                          }
                                        </div>
                                      )}

                                      <div className="mt-1 text-base font-extrabold">
                                        ₹
                                        {
                                          product.price
                                        }
                                      </div>

                                    </div>
                                  </div>

                                  {/* ACTION */}

                                  <div className="border-t border-[var(--border)] p-3">

                                    {product.stock >
                                    0 ? (
                                      <button
                                        onClick={async () => {
                                          const success =
                                            await addVariantToCart(
                                              product.variant_id,
                                            );

                                          if (
                                            success
                                          ) {
                                            setCartOpen(
                                              true,
                                            );
                                          }
                                        }}
                                        className="w-full rounded-xl bg-[var(--primary)] py-2.5 text-xs font-bold text-white transition hover:bg-[var(--primary-dark)]"
                                      >
                                        + Add to Cart
                                      </button>
                                    ) : (
                                      <button
                                        disabled
                                        className="w-full rounded-xl bg-[var(--deep)]/20 py-2.5 text-xs font-bold text-[var(--muted)]"
                                      >
                                        Out of Stock
                                      </button>
                                    )}

                                  </div>
                                </div>
                              ),
                            )}

                          </div>
                        )}

                    </div>
                  </div>
                ),
              )}

              {/* LOADING */}

              {agentLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--agent-bg)] px-4 py-3 text-sm">
                    <span className="animate-pulse">
                      ✨ Agent is searching the catalog...
                    </span>
                  </div>
                </div>
              )}

              {/* CAPABILITIES */}

              <div className="rounded-2xl border border-[var(--agent-border)] bg-[var(--agent-bg)] p-4">

                <div className="text-xs font-bold text-[var(--primary)]">
                  ✨ Agent capabilities
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  {[
                    "🔎 Search catalog",
                    "💰 Compare prices",
                    "⬆️ Upsell",
                    "🔗 Cross-sell",
                    "🛒 Manage cart",
                    "💳 Checkout",
                  ].map(
                    (item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs font-medium"
                      >
                        {item}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* INPUT */}

            <div className="border-t border-[var(--border)] p-4">

              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--search-bg)] p-2">

                <input
                  value={
                    message
                  }
                  onChange={(
                    event,
                  ) =>
                    setMessage(
                      event.target
                        .value,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      sendAgentMessage();
                    }
                  }}
                  placeholder="Ask AgentCart..."
                  disabled={
                    agentLoading
                  }
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-[var(--muted)] disabled:opacity-50"
                />

                <button
  onClick={startVoiceInput}
  disabled={agentLoading}
  className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition ${
    isListening
      ? "bg-red-500 text-white animate-pulse"
      : "hover:bg-[var(--hover)]"
  }`}
  title={isListening ? "Stop listening" : "Voice shopping"}
>
  {isListening ? "🔴" : "🎤"}
</button>

                <button
                  onClick={
                    sendAgentMessage
                  }
                  disabled={
                    agentLoading ||
                    !message.trim()
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ➤
                </button>
              </div>

              <p className="mt-2 text-center text-[10px] text-[var(--muted)]">
                Text · Hinglish · Voice
              </p>
            </div>

          </aside>
        </div>
      )}

      {/* CART DRAWER */}

      {cartOpen && (
        <div className="fixed inset-0 z-50">

          <div
            onClick={() =>
              setCartOpen(false)
            }
            className="absolute inset-0 bg-[var(--deep)]/60 backdrop-blur-sm"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-[var(--border)] p-5">

              <div>
                <h2 className="text-xl font-extrabold">
                  Your Cart
                </h2>

                <p className="text-xs text-[var(--muted)]">
                  {cartCount}{" "}
                  item
                  {cartCount !==
                  1
                    ? "s"
                    : ""}
                </p>
              </div>

              <button
                onClick={() =>
                  setCartOpen(
                    false,
                  )
                }
                className="text-2xl text-[var(--muted)]"
              >
                ×
              </button>
            </div>

            {/* ITEMS */}

            <div className="flex-1 overflow-y-auto p-5">

              {loadingCart ? (
                <div className="space-y-3">

                  {[1, 2].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-24 animate-pulse rounded-2xl bg-[var(--product-bg)]"
                      />
                    ),
                  )}
                </div>
              ) : !cart ||
                cart.items
                  .length ===
                  0 ? (

                <div className="flex h-full flex-col items-center justify-center text-center">

                  <div className="text-6xl">
                    🛒
                  </div>

                  <h3 className="mt-5 text-lg font-bold">
                    Your cart is
                    empty
                  </h3>

                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Add something
                    you love.
                  </p>
                </div>

              ) : (

                <div className="space-y-3">

                  {cart.items.map(
                    (item) => (

                      <div
                        key={
                          item.id
                        }
                        className="rounded-2xl border border-[var(--border)] bg-[var(--agent-bg)] p-4"
                      >

                        <div className="flex justify-between gap-3">

                          <div>

                            <div className="text-sm font-bold">
                              {
                                item.product_name
                              }
                            </div>

                            <div className="mt-1 text-xs text-[var(--muted)]">
                              SKU:{" "}
                              {
                                item.sku
                              }
                            </div>

                            <div className="mt-2 font-extrabold">
                              ₹
                              {
                                item.unit_price
                              }
                            </div>

                          </div>

                          <button
                            onClick={() =>
                              removeFromCart(
                                item.id,
                              )
                            }
                            className="h-8 text-xs font-semibold text-red-500"
                          >
                            Remove
                          </button>

                        </div>

                        {/* QUANTITY */}

                        <div className="mt-4 flex items-center justify-between">

                          <span className="text-xs text-[var(--muted)]">
                            Quantity
                          </span>

                          <div className="flex items-center gap-3">

                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.id,
                                  item.quantity -
                                    1,
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)]"
                            >
                              −
                            </button>

                            <span className="w-5 text-center text-sm font-bold">
                              {
                                item.quantity
                              }
                            </span>

                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.id,
                                  item.quantity +
                                    1,
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white"
                            >
                              +
                            </button>

                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* FOOTER */}

            {cart &&
              cart.items
                .length > 0 && (

                <div className="border-t border-[var(--border)] p-5">

                  <div className="mb-4 flex justify-between">

                    <span className="text-[var(--muted)]">
                      Subtotal
                    </span>

                    <span className="text-xl font-extrabold">
                      ₹
                      {
                        cart.subtotal
                      }
                    </span>
                  </div>

                  <button
                    onClick={async () => {
                      setCartOpen(false);
                      setAgentOpen(true);
                      await startRazorpayCheckout();
                    }}
                    disabled={paymentLoading}
                    className="w-full rounded-xl bg-[var(--primary)] py-3.5 font-bold text-white shadow-lg transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {paymentLoading
                      ? "Processing..."
                      : "✨ Checkout with Agent"}
                  </button>
                </div>
              )}
          </aside>
        </div>
      )}
    </main>
  );
}

/* ================================================= */
/* PRODUCT GRID */
/* ================================================= */

function ProductGrid({
  products,
  onAdd,
}: {
  products: Product[];
  onAdd: (
    product: Product,
  ) => void;
}) {
  if (
    products.length ===
    0
  ) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">

        <div className="text-4xl">
          🔍
        </div>

        <h3 className="mt-3 font-bold">
          No products found
        </h3>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Try another search or
          category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

      {products.map(
        (product) => {

          const variant =
            product.variants.find(
              (item) =>
                item.stock > 0,
            ) ||
            product.variants[0];

          return (
            <div
              key={
                product.id
              }
              className="product-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
            >

              <div className="relative flex h-48 items-center justify-center overflow-hidden bg-[var(--product-bg)]">

                {product.image_url ? (
                  <img
                    src={
                      product.image_url
                    }
                    alt={
                      product.name
                    }
                    className="h-full w-full object-contain p-5 transition duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="text-7xl">
                    🛍️
                  </div>
                )}

                {variant &&
                  variant.stock >
                    0 && (
                    <span className="absolute left-3 top-3 rounded-md bg-[var(--primary)] px-2 py-1 text-[10px] font-bold text-white">
                      In Stock
                    </span>
                  )}

                {variant &&
                  variant.stock <=
                    0 && (
                    <span className="absolute left-3 top-3 rounded-md bg-[var(--deep)] px-2 py-1 text-[10px] font-bold text-white">
                      Out of Stock
                    </span>
                  )}
              </div>

              <div className="p-4">

                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                  {
                    product.category
                  }
                </div>

                {product.brand && (
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {
                      product.brand
                    }
                  </div>
                )}

                <h3 className="mt-1 min-h-[42px] text-sm font-bold leading-5">
                  {
                    product.name
                  }
                </h3>

                {product.rating !==
                  null && (
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    ⭐{" "}
                    {
                      product.rating
                    }
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">

                  {variant ? (
                    <span className="text-lg font-extrabold">
                      ₹
                      {
                        variant.price
                      }
                    </span>
                  ) : (
                    <span className="text-sm text-[var(--muted)]">
                      Price
                      unavailable
                    </span>
                  )}
                </div>

                <button
                  disabled={
                    !variant ||
                    variant.stock <=
                      0
                  }
                  onClick={() =>
                    onAdd(
                      product,
                    )
                  }
                  className="mt-3 w-full rounded-xl bg-[var(--primary)] py-2.5 text-xs font-bold text-white transition hover:bg-[var(--primary-dark)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {!variant ||
                  variant.stock <=
                    0
                    ? "Out of Stock"
                    : "+ Add to Cart"}
                </button>
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}