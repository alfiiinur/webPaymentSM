import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const order = await prisma.order.findFirst({
  where: { customerEmail: 'alfi2@gmail.com', status: 'PAID', activationToken: { not: null } },
  select: { activationToken: true, orderNumber: true },
  orderBy: { createdAt: 'desc' },
})

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
console.log('Activation link:')
console.log(`${appUrl}/activate/${order?.activationToken}`)

await prisma.$disconnect()
