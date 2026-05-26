-- AlterTable
ALTER TABLE "brew_recommendation_links" ALTER COLUMN "linked_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "brews" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "recommendations" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);
