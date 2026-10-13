-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('AVAILABLE', 'USED', 'INACTIVE');

-- AlterTable
ALTER TABLE "ProductAccess" ADD COLUMN     "credentialId" TEXT,
ADD COLUMN     "hasWarranty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replacedAt" TIMESTAMP(3),
ADD COLUMN     "replacedCredentialId" TEXT;

-- CreateTable
CREATE TABLE "ProductCredential" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "notes" TEXT,
    "status" "CredentialStatus" NOT NULL DEFAULT 'AVAILABLE',
    "maxSlots" INTEGER NOT NULL DEFAULT 1,
    "usedSlots" INTEGER NOT NULL DEFAULT 0,
    "hasWarranty" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCredential_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductAccess" ADD CONSTRAINT "ProductAccess_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAccess" ADD CONSTRAINT "ProductAccess_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "ProductCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAccess" ADD CONSTRAINT "ProductAccess_replacedCredentialId_fkey" FOREIGN KEY ("replacedCredentialId") REFERENCES "ProductCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCredential" ADD CONSTRAINT "ProductCredential_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
