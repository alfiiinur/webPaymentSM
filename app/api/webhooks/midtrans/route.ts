import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateMidtransSignature } from '@/lib/webhook-validator'
import { fulfillOrder } from '@/lib/fulfillment'

// Midtrans expects a fast 200 response — never let this endpoint crash.
// Return 200 for all business-logic cases; only return non-200 for invalid signatures.

interface MidtransNotification {
  order_id: string
  transaction_id: string
  transaction_status: string
  fraud_status?: string
  status_code: string
  gross_amount: string
  payment_type?: string
  signature_key: string
}

export async function POST(request: NextRequest) {
  let body: MidtransNotification

  // ── 1. Parse body ──────────────────────────────────────────────────────────
  try {
    body = (await request.json()) as MidtransNotification
  } catch {
    console.error('[WEBHOOK] Failed to parse JSON body')
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    order_id: orderNumber,
    transaction_id: transactionId,
    transaction_status: transactionStatus,
    fraud_status: fraudStatus,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
  } = body

  console.log(`[WEBHOOK] Received: order=${orderNumber} status=${transactionStatus} fraud=${fraudStatus}`)

  // ── 2. Validate signature ─────────────────────────────────────────────────
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? ''

  if (!serverKey) {
    console.error('[WEBHOOK] MIDTRANS_SERVER_KEY not configured')
    return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const isValid = validateMidtransSignature(
    orderNumber,
    statusCode,
    grossAmount,
    serverKey,
    signatureKey
  )

  if (!isValid) {
    console.warn(`[WEBHOOK] Invalid signature for order ${orderNumber}`)
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // ── 3. Find Payment by orderNumber ────────────────────────────────────────
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      payment: {
        select: {
          id: true,
          status: true,
          amount: true,
        },
      },
    },
  })

  if (!order || !order.payment) {
    console.warn(`[WEBHOOK] Order not found: ${orderNumber}`)
    // Return 200 to stop Midtrans retrying for unknown orders
    return Response.json({ message: 'Order not found, acknowledged' })
  }

  // ── 4. Validate amount ────────────────────────────────────────────────────
  const incomingAmount = Math.round(parseFloat(grossAmount))
  if (incomingAmount !== order.payment.amount) {
    console.error(
      `[WEBHOOK] Amount mismatch for ${orderNumber}: expected ${order.payment.amount}, got ${incomingAmount}`
    )
    return Response.json({ error: 'Amount mismatch' }, { status: 400 })
  }

  // ── 5. Idempotency check — skip if already PAID ───────────────────────────
  if (order.payment.status === 'PAID') {
    console.log(`[WEBHOOK] Order ${orderNumber} already PAID, skipping`)
    return Response.json({ message: 'Already processed' })
  }

  // ── 6. Determine new status based on transaction_status ───────────────────
  const isPaid =
    transactionStatus === 'settlement' ||
    (transactionStatus === 'capture' && fraudStatus === 'accept')

  const isFailed =
    transactionStatus === 'deny' ||
    transactionStatus === 'cancel' ||
    transactionStatus === 'expire'

  const isExpired = transactionStatus === 'expire'

  // ── 7. Update database ────────────────────────────────────────────────────
  if (isPaid) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentReference: transactionId,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      }),
    ])

    console.log(`[WEBHOOK] ✅ Order ${orderNumber} marked PAID`)

    // ── 8. Trigger fulfillment ───────────────────────────────────────────────
    // Run after DB update — if fulfillment fails, webhook already returned 200
    // so Midtrans won't retry, but order is correctly marked PAID
    try {
      await fulfillOrder(order.id)
      console.log(`[WEBHOOK] ✅ Fulfillment complete for order ${order.id}`)
    } catch (err) {
      // Log but don't fail the webhook — payment is already recorded
      console.error(`[WEBHOOK] ⚠️ Fulfillment failed for order ${order.id}:`, err)
    }
  } else if (isFailed) {
    const newStatus = isExpired ? 'EXPIRED' : 'FAILED'

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: newStatus },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus },
      }),
    ])

    console.log(`[WEBHOOK] ❌ Order ${orderNumber} marked ${newStatus}`)
  } else {
    // pending or other — no change needed
    console.log(`[WEBHOOK] ⏳ Order ${orderNumber} status unchanged: ${transactionStatus}`)
  }

  // Always return 200 quickly so Midtrans doesn't retry
  return Response.json({ message: 'OK' })
}
