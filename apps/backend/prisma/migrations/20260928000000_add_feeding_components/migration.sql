ALTER TABLE "feeding" ADD COLUMN "components" "FeedingType"[] NOT NULL DEFAULT ARRAY[]::"FeedingType"[];

UPDATE "feeding" AS f SET "components" = CASE f."feeding_type"
  WHEN 'BREAST_MILK' THEN ARRAY['BREAST_MILK']::"FeedingType"[]
  WHEN 'FORMULA' THEN ARRAY['FORMULA']::"FeedingType"[]
  WHEN 'COMPLEMENTARY_FOOD' THEN ARRAY['COMPLEMENTARY_FOOD']::"FeedingType"[]
  ELSE CASE WHEN EXISTS (SELECT 1 FROM "feeding_food" ff WHERE ff."feeding_id" = f."id")
    THEN ARRAY['BREAST_MILK', 'FORMULA', 'COMPLEMENTARY_FOOD']::"FeedingType"[]
    ELSE ARRAY['BREAST_MILK', 'FORMULA']::"FeedingType"[]
  END
END;
