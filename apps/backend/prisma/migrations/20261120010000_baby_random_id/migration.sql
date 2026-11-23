BEGIN;

-- Keep the old numeric IDs only long enough to remap every relationship.
CREATE TEMP TABLE "_baby_id_map" (
  "old_id" INTEGER NOT NULL PRIMARY KEY,
  "new_id" VARCHAR(16) NOT NULL UNIQUE
);

INSERT INTO "_baby_id_map" ("old_id", "new_id")
SELECT "id", substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
FROM "baby";

ALTER TABLE "feeding" DROP CONSTRAINT "feeding_baby_id_fkey";
ALTER TABLE "diaper" DROP CONSTRAINT "diaper_baby_id_fkey";
ALTER TABLE "sleep" DROP CONSTRAINT "sleep_baby_id_fkey";
ALTER TABLE "supplement" DROP CONSTRAINT "supplement_baby_id_fkey";
ALTER TABLE "activity" DROP CONSTRAINT "activity_baby_id_fkey";
ALTER TABLE "growth_record" DROP CONSTRAINT "growth_record_baby_id_fkey";
ALTER TABLE "medical_record" DROP CONSTRAINT "medical_record_baby_id_fkey";
ALTER TABLE "ai_analysis" DROP CONSTRAINT "ai_analysis_baby_id_fkey";
ALTER TABLE "temperature" DROP CONSTRAINT "temperature_baby_id_fkey";
ALTER TABLE "food_allergy_record" DROP CONSTRAINT "food_allergy_record_baby_id_fkey";
ALTER TABLE "food" DROP CONSTRAINT "food_baby_id_fkey";
ALTER TABLE "supplement_config" DROP CONSTRAINT "supplement_config_baby_id_fkey";
ALTER TABLE "exercise_config" DROP CONSTRAINT "exercise_config_baby_id_fkey";
ALTER TABLE "baby_member" DROP CONSTRAINT "baby_member_baby_id_fkey";
ALTER TABLE "baby_claim" DROP CONSTRAINT "baby_claim_baby_id_fkey";

ALTER TABLE "baby" DROP CONSTRAINT "baby_pkey";
ALTER TABLE "baby" RENAME COLUMN "id" TO "legacy_id";
ALTER TABLE "baby" ADD COLUMN "id" VARCHAR(16);
UPDATE "baby"
SET "id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE "baby"."legacy_id" = "_baby_id_map"."old_id";
ALTER TABLE "baby" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "baby" ADD CONSTRAINT "baby_pkey" PRIMARY KEY ("id");
ALTER TABLE "baby" DROP COLUMN "legacy_id";
ALTER TABLE "baby"
  ALTER COLUMN "id"
  SET DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);

ALTER TABLE "feeding" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "feeding" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "diaper" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "diaper" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "sleep" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "sleep" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "supplement" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "supplement" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "activity" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "activity" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "growth_record" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "growth_record" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "medical_record" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "medical_record" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "ai_analysis" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "ai_analysis" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "temperature" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "temperature" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "food_allergy_record" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "food_allergy_record" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "food" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "food" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "supplement_config" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "supplement_config" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "exercise_config" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "exercise_config" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "baby_member" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "baby_member" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "baby_claim" ALTER COLUMN "baby_id" TYPE VARCHAR(16) USING "baby_id"::text;
UPDATE "baby_claim" AS target
SET "baby_id" = "_baby_id_map"."new_id"
FROM "_baby_id_map"
WHERE target."baby_id" = "_baby_id_map"."old_id"::text;

ALTER TABLE "feeding" ADD CONSTRAINT "feeding_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diaper" ADD CONSTRAINT "diaper_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sleep" ADD CONSTRAINT "sleep_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplement" ADD CONSTRAINT "supplement_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity" ADD CONSTRAINT "activity_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "growth_record" ADD CONSTRAINT "growth_record_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medical_record" ADD CONSTRAINT "medical_record_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "temperature" ADD CONSTRAINT "temperature_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_allergy_record" ADD CONSTRAINT "food_allergy_record_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food" ADD CONSTRAINT "food_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplement_config" ADD CONSTRAINT "supplement_config_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exercise_config" ADD CONSTRAINT "exercise_config_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "baby_member" ADD CONSTRAINT "baby_member_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "baby_claim" ADD CONSTRAINT "baby_claim_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
