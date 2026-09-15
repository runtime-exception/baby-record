ALTER TYPE "FeedingType" ADD VALUE IF NOT EXISTS 'COMPLEMENTARY_FOOD' BEFORE 'MIXED';

CREATE TYPE "AllergyConclusion" AS ENUM ('NOT_ALLERGIC', 'POSSIBLE', 'ALLERGIC');

CREATE TABLE "food" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "food_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "food_name_key" ON "food"("name");

CREATE TABLE "feeding_food" (
  "feeding_id" INTEGER NOT NULL,
  "food_id" INTEGER NOT NULL,
  CONSTRAINT "feeding_food_pkey" PRIMARY KEY ("feeding_id", "food_id"),
  CONSTRAINT "feeding_food_feeding_id_fkey" FOREIGN KEY ("feeding_id") REFERENCES "feeding"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "feeding_food_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "food"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "feeding_food_food_id_idx" ON "feeding_food"("food_id");

CREATE TABLE "food_allergy_record" (
  "id" SERIAL NOT NULL,
  "baby_id" INTEGER NOT NULL,
  "food_id" INTEGER NOT NULL,
  "exposure_time" TIMESTAMP(3) NOT NULL,
  "observations" JSONB NOT NULL,
  "system_score" INTEGER NOT NULL,
  "system_conclusion" "AllergyConclusion" NOT NULL,
  "final_conclusion" "AllergyConclusion" NOT NULL,
  "remark" TEXT,
  "creator_id" INTEGER NOT NULL,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "food_allergy_record_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "food_allergy_record_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "food_allergy_record_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "food"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "food_allergy_record_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "food_allergy_record_baby_id_exposure_time_idx" ON "food_allergy_record"("baby_id", "exposure_time");
CREATE INDEX "food_allergy_record_baby_id_food_id_exposure_time_idx" ON "food_allergy_record"("baby_id", "food_id", "exposure_time");
CREATE INDEX "food_allergy_record_creator_id_idx" ON "food_allergy_record"("creator_id");

INSERT INTO "food" ("name") VALUES
  ('强化铁米粉'), ('燕麦'), ('小米粥'), ('小麦面条'), ('土豆'), ('红薯'), ('山药'),
  ('全熟鸡蛋'), ('猪肉'), ('牛肉'), ('鸡肉'), ('鱼'), ('虾'), ('豆腐'), ('原味全脂酸奶'),
  ('花生酱（稀释）'), ('坚果酱（无整粒）'), ('芝麻酱'), ('南瓜'), ('胡萝卜'), ('西兰花'),
  ('菠菜'), ('苹果'), ('香蕉'), ('梨'), ('牛油果')
ON CONFLICT ("name") DO NOTHING;
