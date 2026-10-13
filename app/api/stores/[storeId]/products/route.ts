import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({
  storeId: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid store ID", code: "INVALID_PARAMS" },
      { status: 400 },
    );
  }

  const { storeId } = parsed.data;
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";

  try {
    // Verify store exists first
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!store) {
      return Response.json(
        { error: "Store not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const products = await prisma.product.findMany({
      where: {
        storeId,
        isActive: true,
        // Only show products that have at least one credential with available slots
        // When all credentials are USED or INACTIVE → product disappears from checkout
        productCredentials: {
          some: { status: "AVAILABLE" },
        },
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      select: {
        id: true,
        name: true,
        packageType: true,
        duration: true,
        durationUnit: true,
        price: true,
      },
      orderBy: { packageType: "asc" },
    });

    return Response.json({ products });
  } catch {
    return Response.json(
      { error: "Failed to fetch products", code: "FETCH_ERROR" },
      { status: 500 },
    );
  }
}
