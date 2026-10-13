import { prisma } from "@/lib/prisma";
import CredentialsClient from "./credentials-client";

export default async function AdminCredentialsPage() {
  const [rawCredentials, products] = await Promise.all([
    prisma.productCredential.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            packageType: true,
            store: { select: { name: true } },
          },
        },
        productAccess: {
          select: {
            id: true,
            grantedAt: true,
            account: { select: { email: true } },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        packageType: true,
        store: { select: { name: true } },
      },
    }),
  ]);

  // Serialize Dates for client components
  const credentials = rawCredentials.map((c) => ({
    ...c,
    status: c.status as string,
    assignedAt: c.assignedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    productAccess: c.productAccess.map((pa) => ({
      ...pa,
      grantedAt: pa.grantedAt.toISOString(),
    })),
  }));

  return (
    <CredentialsClient
      initialCredentials={credentials as never}
      products={products}
    />
  );
}
