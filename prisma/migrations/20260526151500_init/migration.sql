-- CreateTable
CREATE TABLE "origins" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "subregion" TEXT,
    "aliases" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "origins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brewing_methods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_temp_c" INTEGER NOT NULL,
    "grind_size" TEXT NOT NULL,
    "default_brew_time_s" INTEGER NOT NULL,
    "default_ratio" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "brewing_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brews" (
    "id" SERIAL NOT NULL,
    "brewing_method_id" INTEGER NOT NULL,
    "origin" TEXT NOT NULL,
    "roast_level" TEXT NOT NULL,
    "grind_size" TEXT NOT NULL,
    "water_temp_c" INTEGER NOT NULL,
    "ratio" DOUBLE PRECISION NOT NULL,
    "brew_time_s" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'user_submitted',
    "source_url" TEXT,
    "field_confidence" TEXT,

    CONSTRAINT "brews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" SERIAL NOT NULL,
    "brewing_method_id" INTEGER NOT NULL,
    "origin" TEXT NOT NULL,
    "roast_level" TEXT NOT NULL,
    "grind_size" TEXT NOT NULL,
    "water_temp_c" INTEGER NOT NULL,
    "ratio" DOUBLE PRECISION NOT NULL,
    "brew_time_s" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "confidence_breakdown" TEXT,
    "sources" TEXT,
    "fingerprint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brew_recommendation_links" (
    "brew_id" INTEGER NOT NULL,
    "recommendation_id" INTEGER NOT NULL,
    "match_confidence" DOUBLE PRECISION NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brew_recommendation_links_pkey" PRIMARY KEY ("brew_id","recommendation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "origins_name_key" ON "origins"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brewing_methods_name_key" ON "brewing_methods"("name");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_fingerprint_key" ON "recommendations"("fingerprint");

-- AddForeignKey
ALTER TABLE "brews" ADD CONSTRAINT "brews_brewing_method_id_fkey" FOREIGN KEY ("brewing_method_id") REFERENCES "brewing_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_brewing_method_id_fkey" FOREIGN KEY ("brewing_method_id") REFERENCES "brewing_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brew_recommendation_links" ADD CONSTRAINT "brew_recommendation_links_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "brews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brew_recommendation_links" ADD CONSTRAINT "brew_recommendation_links_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
