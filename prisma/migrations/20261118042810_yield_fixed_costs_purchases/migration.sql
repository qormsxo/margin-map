-- CreateEnum
CREATE TYPE "FixedCostCategory" AS ENUM ('LABOR', 'RENT', 'UTILITIES', 'OTHER');

-- AlterEnum
ALTER TYPE "PeriodGrain" ADD VALUE 'MONTH';

-- AlterTable
ALTER TABLE "CostBasisIngredient" ADD COLUMN     "yieldRate" DECIMAL(8,6) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "yieldRate" DECIMAL(8,6) NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "FixedCostItem" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FixedCostCategory" NOT NULL,
    "monthlyAmount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedCostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRecord" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "purchasedOn" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "supplier" TEXT,
    "note" TEXT,
    "source" "FactSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedCostItem_storeId_idx" ON "FixedCostItem"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "FixedCostItem_storeId_name_key" ON "FixedCostItem"("storeId", "name");

-- CreateIndex
CREATE INDEX "PurchaseRecord_storeId_purchasedOn_idx" ON "PurchaseRecord"("storeId", "purchasedOn");

-- AddForeignKey
ALTER TABLE "FixedCostItem" ADD CONSTRAINT "FixedCostItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
