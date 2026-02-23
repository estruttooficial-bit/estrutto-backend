-- Migration: Rename engineer to user
-- Created manually due to connection issues

-- 1. Add new column as nullable
ALTER TABLE "Obra" ADD COLUMN IF NOT EXISTS "userId" INTEGER;

-- 2. Copy data from old column to new
UPDATE "Obra" SET "userId" = "engineerId" WHERE "userId" IS NULL;

-- 3. Make new column required (handle existing nulls first)
ALTER TABLE "Obra" ALTER COLUMN "userId" SET NOT NULL;

-- 4. Drop old foreign key if exists
ALTER TABLE "Obra" DROP CONSTRAINT IF EXISTS "Obra_engineerId_fkey";

-- 5. Drop old column
ALTER TABLE "Obra" DROP COLUMN IF EXISTS "engineerId";

-- 6. Add new foreign key
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

-- 7. Update indexes
DROP INDEX IF EXISTS "Obra_engineerId_idx";
CREATE INDEX IF NOT EXISTS "Obra_userId_idx" ON "Obra"("userId");