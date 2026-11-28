/**
 * 环境变量配置加载：
 * - 若直接提供 DATABASE_URL 则优先使用
 * - 否则由 DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD 拼接（密码自动 URL 编码）
 */
export default () => {
  // 记录日期由家庭所在地的自然日定义，不能依赖容器默认的 UTC 时区。
  // Node 会读取 TZ 来解析 Date#getHours / setHours，需在应用初始化时尽早设置。
  const timeZone = process.env.APP_TIME_ZONE || 'Asia/Shanghai';
  process.env.TZ = timeZone;
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT || '5432';
  const name = process.env.DATABASE_NAME;
  const username = process.env.DATABASE_USERNAME;
  const password = process.env.DATABASE_PASSWORD || '';

  const url =
    process.env.DATABASE_URL ||
    `postgresql://${encodeURIComponent(username || '')}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(name || '')}?schema=public`;

  // 运行时确保 Prisma 可读取 DATABASE_URL
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = url;
  }

  return {
    database: {
      host,
      port: Number(port),
      name,
      username,
      password,
      url,
    },
    app: {
      port: Number(process.env.APP_PORT) || 3000,
      env: process.env.NODE_ENV || 'development',
      timeZone,
      apiPrefix: process.env.API_PREFIX || 'api/v1',
      swaggerPath: process.env.SWAGGER_PATH || 'docs',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    },
    auth: {
      wechatAppId: process.env.WECHAT_APP_ID,
      wechatAppSecret: process.env.WECHAT_APP_SECRET,
      wechatEnvVersion: process.env.WECHAT_ENV_VERSION,
      sessionDays: Number(process.env.BABY_RECORD_SESSION_DAYS) || 30,
      cookieSecure:
        process.env.BABY_RECORD_COOKIE_SECURE === 'true' ||
        (process.env.BABY_RECORD_COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production'),
    },
  };
};
