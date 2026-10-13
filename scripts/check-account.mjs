import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const email = 'alfi2@gmail.com'

const account = await prisma.account.findUnique({
  where: { email },
  select: {
    id: true,
    email: true,
    status: true,
    passwordHash: true,
    activationTokenHash: true,
    activationExpiresAt: true,
    createdAt: true,
  },
})

console.log('Account:', JSON.stringify({
  ...account,
  passwordHash: account?.passwordHash ? `[set, length: ${account.passwordHash.length}]` : null,
  activationTokenHash: account?.activationTokenHash ? `[set]` : null,
}, null, 2))

await prisma.$disconnect()
