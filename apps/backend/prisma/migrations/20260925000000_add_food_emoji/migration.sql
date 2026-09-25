-- 辅食图标改为独立字段，允许用户在新增/编辑时自行指定；为空时前端按名称推断。
ALTER TABLE "food" ADD COLUMN "emoji" TEXT;
