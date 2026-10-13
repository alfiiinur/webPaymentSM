import { notFound, redirect } from "next/navigation";
import Script from "next/script";
import { prisma } from "@/lib/prisma";
import { PaymentClient } from "./payment-client";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  // Fetch order with payment and product details
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      customerName: true,
      product: {
        select: {
          name: true,
          packageType: true,
          duration: true,
          durationUnit: true,
        },
      },
      payment: {
        select: {
          snapToken: true,
          amount: true,
          status: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // If already paid → redirect to receipt
  if (order.status === "PAID") {
    redirect(`/payment/${orderId}/receipt`);
  }

  // If payment failed or no snap token — show error state inline
  // (don't throw — let PaymentClient handle FAILED status display)
  const snapToken = order.payment?.snapToken;
  const amount = order.payment?.amount ?? 0;

  const productName = order.product
    ? `${order.product.name} ${order.product.packageType} ${order.product.duration} ${order.product.durationUnit}`
    : "Produk";

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";

  return (
    <>
      {/* Load Midtrans Snap.js from CDN */}
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={clientKey}
        strategy="afterInteractive"
      />

      {snapToken ? (
        <PaymentClient
          orderId={orderId}
          orderNumber={order.orderNumber}
          snapToken={snapToken}
          productName={productName}
          amount={amount}
        />
      ) : (
        // No snap token — Midtrans call failed during order creation
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-7 h-7 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-red-600 font-bold text-lg">
              Pembayaran Tidak Tersedia
            </p>
            <p className="text-sm text-gray-500">
              Order{" "}
              <span className="font-mono text-gray-700">
                {order.orderNumber}
              </span>{" "}
              tidak memiliki token pembayaran yang valid.
            </p>
            <a
              href="/checkout"
              className="inline-block mt-2 bg-gray-900 hover:bg-gray-800 text-white text-sm px-6 py-2.5 rounded-xl transition-colors"
            >
              Kembali ke Checkout
            </a>
          </div>
        </div>
      )}
    </>
  );
}
