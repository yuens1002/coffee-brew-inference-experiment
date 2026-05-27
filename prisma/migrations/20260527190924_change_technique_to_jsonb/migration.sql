-- Alter technique column from TEXT to JSONB for native JSON querying
ALTER TABLE "brewing_methods" 
  ALTER COLUMN "technique" TYPE JSONB USING technique::jsonb;
