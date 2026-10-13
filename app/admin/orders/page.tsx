import { prisma } from "@/lib/prisma";
import OrdersClient from "./orders-client";

export default async function AdminOrdersPage() {
  const raw = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      product: { select: { id: true, name: true, packageType: true } },
      store: { select: { id: true, name: true } },
      payment: {
        select: {
          id: true,
          status: true,
          amount: true,
          paidAt: true,
          paymentMethod: true,
        },
      },
      // Sertakan productAccess agar client bisa tahu apakah credential sudah di-assign
      productAccess: {
        select: {
          id: true,
          credentialId: true,
          credential: {
            select: { id: true, email: true, status: true },
          },
        },
      },
    },
  });

  // Serialize Dates and enums to plain strings for client components
  const orders = raw.map((o) => ({
    ...o,
    status: o.status as string,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    payment: o.payment
      ? {
          ...o.payment,
          status: o.payment.status as string,
          paidAt: o.payment.paidAt?.toISOString() ?? null,
        }
      : null,
  }));

  return <OrdersClient initialOrders={orders} />;
}
