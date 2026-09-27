CREATE TABLE "supplement_config" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "emoji" TEXT,
  "default_amount" TEXT,
  "default_unit" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "supplement_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplement_config_name_key" ON "supplement_config"("name");

INSERT INTO "supplement_config" ("name", "emoji", "default_amount", "default_unit") VALUES
  ('维生素D', '☀️', '1', '滴'),
  ('DHA', '🐟', '1', '粒'),
  ('钙', '🦴', '1', '粒');
