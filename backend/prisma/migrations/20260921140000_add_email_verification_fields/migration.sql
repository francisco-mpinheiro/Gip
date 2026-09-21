ALTER TABLE "users"
ADD COLUMN "pendingEmail" TEXT,
ADD COLUMN "emailToken" TEXT,
ADD COLUMN "emailTokenExpiry" TIMESTAMP(3);