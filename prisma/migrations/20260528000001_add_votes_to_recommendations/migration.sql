-- B1: add thumbs_up and thumbs_down vote counters to recommendations
ALTER TABLE "recommendations" ADD COLUMN "thumbs_up" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "recommendations" ADD COLUMN "thumbs_down" INTEGER NOT NULL DEFAULT 0;
