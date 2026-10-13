import { prisma } from '@/lib/prisma'
import AccountsClient from './accounts-client'

export default async function AdminAccountsPage() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { productAccess: true } },
    },
  })

  return <AccountsClient initialAccounts={accounts} />
}
