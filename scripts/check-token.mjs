import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

// Check orders for this email
const orders = await prisma.order.findMany({
  where: { customerEmail: 'alfi2@gmail.com' },
  select: {
    id: true, orderNumber: true, status: true, activationToken: true, createdAt: true,
  },
  orderBy: { createdAt: 'desc' },
  take: 5,
})

console.log('Orders:')
orders.forEach(o => {
  console.log(` - ${o.orderNumber} | ${o.status} | activationToken: ${o.activationToken ? `[set, length: ${o.activationToken.length}]` : 'null'}`)
})

// Check account
const account = await prisma.account.findUnique({
  where: { email: 'alfi2@gmail.com' },
  select: { status: true, activationTokenHash: true, activationExpiresAt: true },
})
console.log('\nAccount status:', account?.status)
console.log('Has token hash:', !!account?.activationTokenHash)
console.log('Token expires:', account?.activationExpiresAt)
console.log('Token expired?', account?.activationExpiresAt ? account.activationExpiresAt < new Date() : 'N/A')

await prisma.$disconnect()
