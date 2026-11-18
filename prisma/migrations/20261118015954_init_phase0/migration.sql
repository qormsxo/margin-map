-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER');

-- CreateEnum
CREATE TYPE "BaseUnit" AS ENUM ('G', 'ML', 'EA');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('TAXABLE', 'EXEMPT');

-- CreateEnum
CREATE TYPE "PriceChangeSource" AS ENUM ('MANUAL', 'CSV_IMPORT', 'AI_ASSIST_CONFIRMED');

-- CreateEnum
CREATE TYPE "RecipeOwnerType" AS ENUM ('MENU', 'PREP');

-- CreateEnum
CREATE TYPE "RecipeComponentType" AS ENUM ('INGREDIENT', 'PREP');

-- CreateEnum
CREATE TYPE "MenuPriceSource" AS ENUM ('MANUAL', 'SIMULATION_APPLY');

-- CreateEnum
CREATE TYPE "FeeBasis" AS ENUM ('PER_MENU_ITEM');

-- CreateEnum
CREATE TYPE "PeriodGrain" AS ENUM ('DAY', 'WEEK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FactSource" AS ENUM ('MANUAL', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "CostBasisType" AS ENUM ('AS_OF', 'PERIOD_END', 'WEEKLY');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('VARIANCE', 'CONTRIBUTION', 'WEEKLY', 'PRICE_IMPACT');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('COMPLETED', 'INSUFFICIENT_DATA', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARN');

-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('DRAFT', 'APPLIED', 'DISCARDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'OWNER',

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUnit" "BaseUnit" NOT NULL,
    "purchaseQty" DECIMAL(18,6) NOT NULL,
    "purchasePrice" DECIMAL(18,2) NOT NULL,
    "taxType" "TaxType" NOT NULL,
    "currentUnitCost" DECIMAL(18,6) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientPriceHistory" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "previousUnitCost" DECIMAL(18,6) NOT NULL,
    "newUnitCost" DECIMAL(18,6) NOT NULL,
    "previousPurchasePrice" DECIMAL(18,2),
    "newPurchasePrice" DECIMAL(18,2),
    "previousPurchaseQty" DECIMAL(18,6),
    "newPurchaseQty" DECIMAL(18,6),
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "PriceChangeSource" NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "IngredientPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepRecipe" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yieldQty" DECIMAL(18,6) NOT NULL,
    "yieldUnit" "BaseUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellingPrice" DECIMAL(18,2) NOT NULL,
    "vatInclusive" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeLine" (
    "id" TEXT NOT NULL,
    "ownerType" "RecipeOwnerType" NOT NULL,
    "menuItemId" TEXT,
    "prepRecipeId" TEXT,
    "componentType" "RecipeComponentType" NOT NULL,
    "ingredientId" TEXT,
    "componentPrepId" TEXT,
    "qty" DECIMAL(18,6) NOT NULL,
    "unit" "BaseUnit" NOT NULL,

    CONSTRAINT "RecipeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuPriceHistory" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "previousPrice" DECIMAL(18,2) NOT NULL,
    "newPrice" DECIMAL(18,2) NOT NULL,
    "channelId" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "source" "MenuPriceSource" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesChannel" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelFeeRate" DECIMAL(8,6) NOT NULL,
    "paymentFeeRate" DECIMAL(8,6) NOT NULL,
    "deliveryFeeRate" DECIMAL(8,6) NOT NULL,
    "deliveryFeeFixed" DECIMAL(18,2) NOT NULL,
    "feeBasis" "FeeBasis" NOT NULL DEFAULT 'PER_MENU_ITEM',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuChannelPrice" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "salesChannelId" TEXT NOT NULL,
    "sellingPrice" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "MenuChannelPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPeriod" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "grain" "PeriodGrain" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesLine" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "salesChannelId" TEXT,
    "qty" DECIMAL(18,3) NOT NULL,
    "source" "FactSource" NOT NULL,
    "importedFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualUsagePeriod" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "alignedSalesPeriodId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActualUsagePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualUsageLine" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "actualQty" DECIMAL(18,6),
    "actualCost" DECIMAL(18,2),
    "unit" "BaseUnit",
    "source" "FactSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActualUsageLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostBasisSnapshot" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "label" TEXT,
    "basisType" "CostBasisType" NOT NULL,
    "asOfAt" TIMESTAMP(3) NOT NULL,
    "periodStart" DATE,
    "periodEnd" DATE,
    "weekStart" DATE,
    "channelId" TEXT,
    "basisVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostBasisSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostBasisIngredient" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "unitCost" DECIMAL(18,6) NOT NULL,
    "purchasePrice" DECIMAL(18,2) NOT NULL,
    "purchaseQty" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "CostBasisIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostBasisRecipeLine" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "ownerType" "RecipeOwnerType" NOT NULL,
    "menuItemId" TEXT,
    "prepRecipeId" TEXT,
    "componentType" "RecipeComponentType" NOT NULL,
    "ingredientId" TEXT,
    "componentPrepId" TEXT,
    "qty" DECIMAL(18,6) NOT NULL,
    "unit" "BaseUnit" NOT NULL,

    CONSTRAINT "CostBasisRecipeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "AnalysisType" NOT NULL,
    "periodStart" DATE,
    "periodEnd" DATE,
    "costBasisSnapshotId" TEXT,
    "salesPeriodId" TEXT,
    "actualUsagePeriodId" TEXT,
    "status" "AnalysisStatus" NOT NULL,
    "insufficientReason" TEXT,
    "evidenceJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarianceResult" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "theoQty" DECIMAL(18,6),
    "theoAmt" DECIMAL(18,2),
    "actualQty" DECIMAL(18,6),
    "actualCost" DECIMAL(18,2),
    "actualAmt" DECIMAL(18,2),
    "varianceQty" DECIMAL(18,6),
    "varianceAmt" DECIMAL(18,2),
    "varianceRate" DECIMAL(18,6),
    "unitCostUsed" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "VarianceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySnapshot" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "channelId" TEXT,
    "costBasisSnapshotId" TEXT,
    "priorWeekStart" DATE,
    "priorSnapshotId" TEXT,
    "basisVersion" TEXT NOT NULL,
    "dataSufficient" BOOLEAN NOT NULL,
    "insufficientReason" TEXT,
    "metricsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "ruleId" TEXT NOT NULL,
    "weeklySnapshotId" TEXT,
    "analysisRunId" TEXT,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "evidenceJson" JSONB,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationScenario" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "status" "SimulationStatus" NOT NULL DEFAULT 'DRAFT',
    "appliedAt" TIMESTAMP(3),
    "applyResultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Store_organizationId_idx" ON "Store"("organizationId");

-- CreateIndex
CREATE INDEX "Ingredient_storeId_idx" ON "Ingredient"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_storeId_name_key" ON "Ingredient"("storeId", "name");

-- CreateIndex
CREATE INDEX "IngredientPriceHistory_ingredientId_effectiveAt_idx" ON "IngredientPriceHistory"("ingredientId", "effectiveAt" DESC);

-- CreateIndex
CREATE INDEX "PrepRecipe_storeId_idx" ON "PrepRecipe"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "PrepRecipe_storeId_name_key" ON "PrepRecipe"("storeId", "name");

-- CreateIndex
CREATE INDEX "MenuItem_storeId_idx" ON "MenuItem"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_storeId_name_key" ON "MenuItem"("storeId", "name");

-- CreateIndex
CREATE INDEX "RecipeLine_menuItemId_idx" ON "RecipeLine"("menuItemId");

-- CreateIndex
CREATE INDEX "RecipeLine_prepRecipeId_idx" ON "RecipeLine"("prepRecipeId");

-- CreateIndex
CREATE INDEX "RecipeLine_ingredientId_idx" ON "RecipeLine"("ingredientId");

-- CreateIndex
CREATE INDEX "RecipeLine_componentPrepId_idx" ON "RecipeLine"("componentPrepId");

-- CreateIndex
CREATE INDEX "MenuPriceHistory_menuItemId_effectiveAt_idx" ON "MenuPriceHistory"("menuItemId", "effectiveAt" DESC);

-- CreateIndex
CREATE INDEX "SalesChannel_storeId_idx" ON "SalesChannel"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesChannel_storeId_name_key" ON "SalesChannel"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MenuChannelPrice_menuItemId_salesChannelId_key" ON "MenuChannelPrice"("menuItemId", "salesChannelId");

-- CreateIndex
CREATE INDEX "SalesPeriod_storeId_idx" ON "SalesPeriod"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesPeriod_storeId_periodStart_periodEnd_key" ON "SalesPeriod"("storeId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "SalesLine_periodId_idx" ON "SalesLine"("periodId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesLine_periodId_menuItemId_salesChannelId_key" ON "SalesLine"("periodId", "menuItemId", "salesChannelId");

-- CreateIndex
CREATE INDEX "ActualUsagePeriod_storeId_idx" ON "ActualUsagePeriod"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ActualUsagePeriod_storeId_periodStart_periodEnd_key" ON "ActualUsagePeriod"("storeId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "ActualUsageLine_periodId_ingredientId_key" ON "ActualUsageLine"("periodId", "ingredientId");

-- CreateIndex
CREATE INDEX "CostBasisSnapshot_storeId_asOfAt_idx" ON "CostBasisSnapshot"("storeId", "asOfAt");

-- CreateIndex
CREATE INDEX "CostBasisSnapshot_storeId_weekStart_idx" ON "CostBasisSnapshot"("storeId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "CostBasisIngredient_snapshotId_ingredientId_key" ON "CostBasisIngredient"("snapshotId", "ingredientId");

-- CreateIndex
CREATE INDEX "CostBasisRecipeLine_snapshotId_idx" ON "CostBasisRecipeLine"("snapshotId");

-- CreateIndex
CREATE INDEX "AnalysisRun_storeId_createdAt_idx" ON "AnalysisRun"("storeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "VarianceResult_analysisRunId_idx" ON "VarianceResult"("analysisRunId");

-- CreateIndex
CREATE INDEX "WeeklySnapshot_storeId_idx" ON "WeeklySnapshot"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySnapshot_storeId_weekStart_channelId_basisVersion_key" ON "WeeklySnapshot"("storeId", "weekStart", "channelId", "basisVersion");

-- CreateIndex
CREATE INDEX "Alert_storeId_weekStart_idx" ON "Alert"("storeId", "weekStart");

-- CreateIndex
CREATE INDEX "Alert_storeId_acknowledgedAt_idx" ON "Alert"("storeId", "acknowledgedAt");

-- CreateIndex
CREATE INDEX "SimulationScenario_storeId_idx" ON "SimulationScenario"("storeId");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientPriceHistory" ADD CONSTRAINT "IngredientPriceHistory_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientPriceHistory" ADD CONSTRAINT "IngredientPriceHistory_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepRecipe" ADD CONSTRAINT "PrepRecipe_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_defaultChannelId_fkey" FOREIGN KEY ("defaultChannelId") REFERENCES "SalesChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_prepRecipeId_fkey" FOREIGN KEY ("prepRecipeId") REFERENCES "PrepRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_componentPrepId_fkey" FOREIGN KEY ("componentPrepId") REFERENCES "PrepRecipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuPriceHistory" ADD CONSTRAINT "MenuPriceHistory_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesChannel" ADD CONSTRAINT "SalesChannel_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuChannelPrice" ADD CONSTRAINT "MenuChannelPrice_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuChannelPrice" ADD CONSTRAINT "MenuChannelPrice_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPeriod" ADD CONSTRAINT "SalesPeriod_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesLine" ADD CONSTRAINT "SalesLine_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "SalesPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesLine" ADD CONSTRAINT "SalesLine_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesLine" ADD CONSTRAINT "SalesLine_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualUsagePeriod" ADD CONSTRAINT "ActualUsagePeriod_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualUsageLine" ADD CONSTRAINT "ActualUsageLine_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ActualUsagePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualUsageLine" ADD CONSTRAINT "ActualUsageLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostBasisSnapshot" ADD CONSTRAINT "CostBasisSnapshot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostBasisIngredient" ADD CONSTRAINT "CostBasisIngredient_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "CostBasisSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostBasisIngredient" ADD CONSTRAINT "CostBasisIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostBasisRecipeLine" ADD CONSTRAINT "CostBasisRecipeLine_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "CostBasisSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_costBasisSnapshotId_fkey" FOREIGN KEY ("costBasisSnapshotId") REFERENCES "CostBasisSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianceResult" ADD CONSTRAINT "VarianceResult_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianceResult" ADD CONSTRAINT "VarianceResult_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySnapshot" ADD CONSTRAINT "WeeklySnapshot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySnapshot" ADD CONSTRAINT "WeeklySnapshot_costBasisSnapshotId_fkey" FOREIGN KEY ("costBasisSnapshotId") REFERENCES "CostBasisSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_weeklySnapshotId_fkey" FOREIGN KEY ("weeklySnapshotId") REFERENCES "WeeklySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationScenario" ADD CONSTRAINT "SimulationScenario_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
