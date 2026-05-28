-- Add user_vote column to brew_recommendation_links
ALTER TABLE "brew_recommendation_links" ADD COLUMN "user_vote" TEXT;