INSERT INTO baby (name, gender, birthday, updated_time) VALUES
  ('Legacy Alpha', 'MALE', '2025-01-01', now()), ('Legacy Beta', 'FEMALE', '2025-03-01', now());
INSERT INTO "user" (name, role) VALUES ('历史记录人', 'DAD');
INSERT INTO food (name, emoji) VALUES ('历史辅食', '🍏'), ('未归属辅食', '🍊');
INSERT INTO supplement_config (name, default_amount, default_unit) VALUES ('历史补剂', '3', '滴');
INSERT INTO exercise_config (name, default_amount, default_unit) VALUES ('历史运动', '4', '次');
INSERT INTO feeding (baby_id, feeding_time, feeding_type, components, creator_id, updated_time)
SELECT baby.id, now(), 'COMPLEMENTARY_FOOD', ARRAY['COMPLEMENTARY_FOOD']::"FeedingType"[], u.id, now()
FROM baby CROSS JOIN "user" u;
INSERT INTO feeding_food (feeding_id, food_id)
SELECT f.id, food.id FROM feeding f CROSS JOIN food WHERE food.name = '历史辅食';
INSERT INTO food_allergy_record (baby_id, food_id, exposure_time, observations, system_score, system_conclusion, final_conclusion, creator_id)
SELECT baby.id, food.id, now(), '{}', 0, 'POSSIBLE', 'POSSIBLE', u.id
FROM baby CROSS JOIN food CROSS JOIN "user" u WHERE baby.name = 'Legacy Alpha' AND food.name = '历史辅食';
INSERT INTO supplement (baby_id, name, amount, unit, take_time, creator_id, updated_time)
SELECT baby.id, '历史补剂', '3', '滴', now(), u.id, now() FROM baby CROSS JOIN "user" u WHERE baby.name = 'Legacy Alpha';
INSERT INTO activity (baby_id, event_type, exercise_types, amount, unit, event_time, creator_id, updated_time)
SELECT baby.id, '运动', ARRAY['历史运动'], '4', '次', now(), u.id, now() FROM baby CROSS JOIN "user" u WHERE baby.name = 'Legacy Beta';
