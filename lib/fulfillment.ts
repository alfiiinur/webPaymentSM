import { prisma } from "@/lib/prisma";
import { generateActivationToken } from "@/lib/activation";

/**
 * Fulfills a paid order by:
 * 1. Creating or reusing a customer Account (PENDING_ACTIVATION)
 * 2. Upserting a ProductAccess record (idempotent)
 * 3. Assigning a slot from the first AVAILABLE credential for the product
 *    — A credential is AVAILABLE when usedSlots < maxSlots
 *    — usedSlots is incremented atomically; status flips to USED when full
 * 4. Storing raw activation token in Order.activationToken for receipt page
 *
 * IDEMPOTENT — safe to call multiple times for the same order.
 */
export async function fulfillOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerEmail: true,
      customerName: true,
      productId: true,
      activationToken: true,
    },
  });

  if (!order) {
    console.error(`[FULFILLMENT] Order not found: ${orderId}`);
    return;
  }

  const expiryHours = parseInt(
    process.env.ACTIVATION_TOKEN_EXPIRES_HOURS ?? "24",
    10,
  );

  // ── Step 1: Find or create Account ───────────────────────────────────────
  let account = await prisma.account.findUnique({
    where: { email: order.customerEmail },
    select: { id: true, status: true, activationTokenHash: true },
  });

  let rawActivationToken: string | null = null;

  if (!account) {
    const { rawToken, hashedToken } = generateActivationToken();
    rawActivationToken = rawToken;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    account = await prisma.account.create({
      data: {
        email: order.customerEmail,
        status: "PENDING_ACTIVATION",
        passwordHash: null,
        activationTokenHash: hashedToken,
        activationExpiresAt: expiresAt,
      },
      select: { id: true, status: true, activationTokenHash: true },
    });
    console.log(`[FULFILLMENT] Created account for ${order.customerEmail}`);
  } else {
    console.log(
      `[FULFILLMENT] Reusing account for ${order.customerEmail} (${account.status})`,
    );
  }

  // ── Step 2: Upsert ProductAccess (idempotent) ────────────────────────────
  const existingAccess = await prisma.productAccess.findUnique({
    where: {
      accountId_productId_orderId: {
        accountId: account.id,
        productId: order.productId,
        orderId: order.id,
      },
    },
    select: { id: true, credentialId: true },
  });

  let productAccessId: string;

  if (existingAccess) {
    productAccessId = existingAccess.id;
    console.log(
      `[FULFILLMENT] ProductAccess already exists: ${productAccessId}`,
    );
  } else {
    const newAccess = await prisma.productAccess.create({
      data: {
        accountId: account.id,
        productId: order.productId,
        orderId: order.id,
      },
      select: { id: true },
    });
    productAccessId = newAccess.id;
    console.log(`[FULFILLMENT] ProductAccess created: ${productAccessId}`);
  }

  // ── Step 3: Assign a credential slot (idempotent, slot-aware) ────────────
  const hasCredential = existingAccess?.credentialId != null;
  if (!hasCredential) {
    await prisma.$transaction(async (tx) => {
      // Find first credential with available slots (usedSlots < maxSlots)
      // We still use status: AVAILABLE as a fast index filter,
      // then re-verify the slot count inside the transaction.
      const credential = await tx.productCredential.findFirst({
        where: {
          productId: order.productId,
          status: "AVAILABLE",
        },
        select: { id: true, maxSlots: true, usedSlots: true },
        orderBy: { usedSlots: "desc" }, // pack existing credentials first (fill before opening new)
      });

      if (!credential) {
        console.warn(
          `[FULFILLMENT] ⚠️ No available credential slot for product ${order.productId}`,
        );
        return;
      }

      // Double-check slot count (guards against race between the findFirst and update)
      if (credential.usedSlots >= credential.maxSlots) {
        console.warn(
          `[FULFILLMENT] ⚠️ Credential ${credential.id} is full (race condition), skipping`,
        );
        return;
      }

      const newUsedSlots = credential.usedSlots + 1;
      const isFull = newUsedSlots >= credential.maxSlots;

      // Atomically increment usedSlots and flip status if full
      await tx.productCredential.update({
        where: { id: credential.id },
        data: {
          usedSlots: { increment: 1 },
          status: isFull ? "USED" : "AVAILABLE",
          assignedAt: credential.usedSlots === 0 ? new Date() : undefined, // set only on first slot
        },
      });

      await tx.productAccess.update({
        where: { id: productAccessId },
        data: { credentialId: credential.id },
      });

      console.log(
        `[FULFILLMENT] ✅ Credential ${credential.id} assigned to ProductAccess ${productAccessId} (slot ${newUsedSlots}/${credential.maxSlots})`,
      );
    });
  } else {
    console.log(
      `[FULFILLMENT] Credential already assigned to ProductAccess ${productAccessId}`,
    );
  }

  // ── Step 4: Store raw token in Order for receipt page ────────────────────
  if (rawActivationToken && !order.activationToken) {
    await prisma.order.update({
      where: { id: order.id },
      data: { activationToken: rawActivationToken },
    });
    console.log(`[FULFILLMENT] Activation token stored in Order ${order.id}`);
  }
}
