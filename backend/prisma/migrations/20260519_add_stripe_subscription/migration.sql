-- AlterTable
ALTER TABLE "users" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "users" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "users" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "users" ADD COLUMN "subscriptionPlan" TEXT;
ALTER TABLE "users" ADD COLUMN "subscriptionCurrentPeriodEnd" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeSubscriptionId_key" ON "users"("stripeSubscriptionId");
