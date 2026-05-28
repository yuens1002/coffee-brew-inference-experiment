-- Add unique constraint on source_url (nullable - only non-null values trigger uniqueness)
CREATE UNIQUE INDEX "brews_source_url_key" ON "brews"("source_url") WHERE "source_url" IS NOT NULL;