-- A1: drop old single-column unique on source_url
DROP INDEX IF EXISTS "brews_source_url_key";

-- A2: add variety column to brews
ALTER TABLE "brews" ADD COLUMN "variety" TEXT;

-- A1: create composite unique (source_url, brewing_method_id)
CREATE UNIQUE INDEX "brews_source_url_brewing_method_id_key" ON "brews"("source_url", "brewing_method_id");
