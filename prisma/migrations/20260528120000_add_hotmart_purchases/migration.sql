CREATE TABLE "hotmart_purchases" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "offerCode" TEXT,
    "transactionId" TEXT,
    "event" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotmart_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hotmart_purchases_transactionId_key" ON "hotmart_purchases"("transactionId");
CREATE INDEX "hotmart_purchases_email_idx" ON "hotmart_purchases"("email");
