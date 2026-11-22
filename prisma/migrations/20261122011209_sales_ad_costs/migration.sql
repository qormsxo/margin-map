-- CreateTable
CREATE TABLE "SalesAdCost" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "salesChannelId" TEXT NOT NULL,
    "adSpend" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "adRate" DECIMAL(8,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesAdCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesAdCost_periodId_salesChannelId_key" ON "SalesAdCost"("periodId", "salesChannelId");

-- AddForeignKey
ALTER TABLE "SalesAdCost" ADD CONSTRAINT "SalesAdCost_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "SalesPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAdCost" ADD CONSTRAINT "SalesAdCost_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
