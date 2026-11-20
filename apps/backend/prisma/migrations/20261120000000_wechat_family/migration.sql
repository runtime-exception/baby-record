BEGIN;

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED');

-- DropIndex
DROP INDEX "food_name_key";

-- DropIndex
DROP INDEX "supplement_config_name_key";

-- DropIndex
DROP INDEX "exercise_config_name_key";

-- AlterTable
ALTER TABLE "food" ADD COLUMN     "baby_id" INTEGER;

-- AlterTable
ALTER TABLE "supplement_config" ADD COLUMN     "baby_id" INTEGER;

-- AlterTable
ALTER TABLE "exercise_config" ADD COLUMN     "baby_id" INTEGER;

-- CreateTable
CREATE TABLE "account" (
    "id" SERIAL NOT NULL,
    "app_id" TEXT NOT NULL,
    "open_id" TEXT NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baby_member" (
    "account_id" INTEGER NOT NULL,
    "baby_id" INTEGER NOT NULL,
    "creator_id" INTEGER,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baby_member_pkey" PRIMARY KEY ("account_id","baby_id")
);

-- CreateTable
CREATE TABLE "account_session" (
    "token_hash" TEXT NOT NULL,
    "account_id" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_session_pkey" PRIMARY KEY ("token_hash")
);

-- CreateTable
CREATE TABLE "web_login" (
    "scene" TEXT NOT NULL,
    "browser_hash" TEXT NOT NULL,
    "account_id" INTEGER,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_login_pkey" PRIMARY KEY ("scene")
);

-- CreateTable
CREATE TABLE "baby_claim" (
    "baby_id" INTEGER NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baby_claim_pkey" PRIMARY KEY ("baby_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_app_id_open_id_key" ON "account"("app_id", "open_id");

-- CreateIndex
CREATE UNIQUE INDEX "baby_member_creator_id_key" ON "baby_member"("creator_id");

-- CreateIndex
CREATE INDEX "baby_member_baby_id_status_idx" ON "baby_member"("baby_id", "status");

-- CreateIndex
CREATE INDEX "account_session_expires_at_idx" ON "account_session"("expires_at");

-- CreateIndex
CREATE INDEX "web_login_expires_at_idx" ON "web_login"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "food_baby_id_name_key" ON "food"("baby_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "supplement_config_baby_id_name_key" ON "supplement_config"("baby_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_config_baby_id_name_key" ON "exercise_config"("baby_id", "name");

-- AddForeignKey
ALTER TABLE "food" ADD CONSTRAINT "food_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_config" ADD CONSTRAINT "supplement_config_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_config" ADD CONSTRAINT "exercise_config_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baby_member" ADD CONSTRAINT "baby_member_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baby_member" ADD CONSTRAINT "baby_member_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baby_member" ADD CONSTRAINT "baby_member_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_session" ADD CONSTRAINT "account_session_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_login" ADD CONSTRAINT "web_login_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baby_claim" ADD CONSTRAINT "baby_claim_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the historical dictionary entry for each baby's feedings and allergies.
WITH ownership AS (
  SELECT f.baby_id, ff.food_id
  FROM feeding_food ff JOIN feeding f ON f.id = ff.feeding_id
  UNION
  SELECT baby_id, food_id FROM food_allergy_record
)
INSERT INTO food (baby_id, name, emoji, is_active, created_time, updated_time)
SELECT ownership.baby_id, food.name, food.emoji, food.is_active, food.created_time, food.updated_time
FROM ownership JOIN food ON food.id = ownership.food_id;

UPDATE feeding_food ff SET food_id = scoped.id
FROM feeding f, food original, food scoped
WHERE ff.feeding_id = f.id AND original.id = ff.food_id
  AND scoped.baby_id = f.baby_id AND scoped.name = original.name;

UPDATE food_allergy_record r SET food_id = scoped.id
FROM food original, food scoped
WHERE original.id = r.food_id AND scoped.baby_id = r.baby_id AND scoped.name = original.name;

-- Supplement and exercise records store names rather than configuration IDs.
INSERT INTO supplement_config (baby_id, name, emoji, default_amount, default_unit, is_active, created_time, updated_time)
SELECT DISTINCT r.baby_id, c.name, c.emoji, c.default_amount, c.default_unit, c.is_active, c.created_time, c.updated_time
FROM supplement r JOIN supplement_config c ON c.name = r.name;

INSERT INTO exercise_config (baby_id, name, emoji, default_amount, default_unit, is_active, created_time, updated_time)
SELECT DISTINCT r.baby_id, c.name, c.emoji, c.default_amount, c.default_unit, c.is_active, c.created_time, c.updated_time
FROM activity r CROSS JOIN LATERAL unnest(r.exercise_types) AS selected(name)
JOIN exercise_config c ON c.name = selected.name;

COMMIT;
