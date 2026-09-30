
-- AlterTable
ALTER TABLE "deleted_transactions" ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);
