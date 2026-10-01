CREATE TABLE "exercise_config" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "emoji" TEXT,
  "default_amount" TEXT NOT NULL,
  "default_unit" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exercise_config_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exercise_config_unit_check" CHECK ("default_unit" IN ('分钟', '秒', '次'))
);
CREATE UNIQUE INDEX "exercise_config_name_key" ON "exercise_config"("name");
INSERT INTO "exercise_config" ("name", "emoji", "default_amount", "default_unit") VALUES
  ('玩耍', '🧸', '1', '分钟'), ('抬头', '👶', '1', '分钟'),
  ('翻身', '🔄', '1', '次'), ('俯卧', '🐣', '1', '分钟'),
  ('踢腿', '🦵', '1', '分钟'), ('抓握', '✋', '1', '次'),
  ('爬行', '🐾', '1', '分钟'), ('练习坐', '🪑', '1', '分钟');
ALTER TABLE "activity" ADD COLUMN "exercise_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "amount" TEXT, ADD COLUMN "unit" TEXT;
UPDATE "activity" SET "exercise_types" = ARRAY["event_type"], "event_type" = '运动'
WHERE "event_type" IN ('玩耍', '抬头', '翻身');
