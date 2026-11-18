-- CreateTable
CREATE TABLE "SalesOrderCount" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "salesChannelId" TEXT NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "source" "FactSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrderCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderCount_periodId_salesChannelId_key" ON "SalesOrderCount"("periodId", "salesChannelId");

-- AddForeignKey
ALTER TABLE "SalesOrderCount" ADD CONSTRAINT "SalesOrderCount_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "SalesPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderCount" ADD CONSTRAINT "SalesOrderCount_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
