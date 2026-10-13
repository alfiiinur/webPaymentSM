import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // ── Store 1: Netflix Official ──────────────────────────────────────
  const netflix = await prisma.store.upsert({
    where: { slug: 'netflix-official' },
    update: {},
    create: {
      name: 'Netflix Official',
      slug: 'netflix-official',
    },
  })

  // ── Store 2: Spotify Premium ───────────────────────────────────────
  const spotify = await prisma.store.upsert({
    where: { slug: 'spotify-premium' },
    update: {},
    create: {
      name: 'Spotify Premium',
      slug: 'spotify-premium',
    },
  })

  console.log(`✓ Stores: ${netflix.name} (${netflix.id}), ${spotify.name} (${spotify.id})`)

  // ── Netflix Products ───────────────────────────────────────────────
  const n1 = await prisma.product.upsert({
    where: { id: 'netflix-basic-1m' },
    update: {},
    create: {
      id: 'netflix-basic-1m',
      storeId: netflix.id,
      name: 'Netflix',
      packageType: 'Basic',
      duration: 1,
      durationUnit: 'Bulan',
      price: 55000,
    },
  })

  const n2 = await prisma.product.upsert({
    where: { id: 'netflix-standard-1m' },
    update: {},
    create: {
      id: 'netflix-standard-1m',
      storeId: netflix.id,
      name: 'Netflix',
      packageType: 'Standard',
      duration: 1,
      durationUnit: 'Bulan',
      price: 75000,
    },
  })

  const n3 = await prisma.product.upsert({
    where: { id: 'netflix-premium-1m' },
    update: {},
    create: {
      id: 'netflix-premium-1m',
      storeId: netflix.id,
      name: 'Netflix',
      packageType: 'Premium',
      duration: 1,
      durationUnit: 'Bulan',
      price: 99000,
    },
  })

  console.log(`✓ Netflix products: ${n1.packageType}, ${n2.packageType}, ${n3.packageType}`)

  // ── Spotify Products ───────────────────────────────────────────────
  const s1 = await prisma.product.upsert({
    where: { id: 'spotify-individual-1m' },
    update: {},
    create: {
      id: 'spotify-individual-1m',
      storeId: spotify.id,
      name: 'Spotify',
      packageType: 'Individual',
      duration: 1,
      durationUnit: 'Bulan',
      price: 35000,
    },
  })

  const s2 = await prisma.product.upsert({
    where: { id: 'spotify-duo-1m' },
    update: {},
    create: {
      id: 'spotify-duo-1m',
      storeId: spotify.id,
      name: 'Spotify',
      packageType: 'Duo',
      duration: 1,
      durationUnit: 'Bulan',
      price: 50000,
    },
  })

  const s3 = await prisma.product.upsert({
    where: { id: 'spotify-family-1m' },
    update: {},
    create: {
      id: 'spotify-family-1m',
      storeId: spotify.id,
      name: 'Spotify',
      packageType: 'Family',
      duration: 1,
      durationUnit: 'Bulan',
      price: 65000,
    },
  })

  console.log(`✓ Spotify products: ${s1.packageType}, ${s2.packageType}, ${s3.packageType}`)
  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
