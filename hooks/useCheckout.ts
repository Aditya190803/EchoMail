import { useState } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async (planId: "pro" | "agency" = "pro") => {
    try {
      setLoading(true);

      // 1. Create order on the backend
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        throw new Error("Failed to create checkout session");
      }

      const orderData = await res.json();

      // 2. Initialize Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use Razorpay test key from environment
        amount: orderData.amount,
        currency: orderData.currency,
        name: "EchoMail",
        description: `Upgrade to ${planId.toUpperCase()} Plan`,
        order_id: orderData.orderId,
        handler: function (_response: any) {
          // After successful payment (we let the webhook do the real db work, but UX updates immediately)
          toast.success("Payment successful! Upgrading your account...");
          setTimeout(() => {
            router.refresh();
            // Force a reload of the UI data to pick up the changes handled by the webhook.
            window.location.reload();
          }, 2000);
        },
        theme: {
          color: "#000000",
        },
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast.error(response.error.description || "Payment failed");
      });

      rzp.open();
    } catch (error: any) {
      toast.error(error.message || "An error occurred during checkout");
    } finally {
      setLoading(false);
    }
  };

  return { handleCheckout, loading };
}
