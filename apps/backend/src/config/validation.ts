import * as Joi from 'joi';

/**
 * 环境变量校验：启动期即发现配置缺失/非法
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  APP_PORT: Joi.number().default(3000),
  APP_TIME_ZONE: Joi.string()
    .custom((value, helpers) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: value });
        return value;
      } catch {
        return helpers.error('any.invalid');
      }
    })
    .default('Asia/Shanghai'),
  API_PREFIX: Joi.string().default('api/v1'),
  SWAGGER_PATH: Joi.string().default('docs'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  WECHAT_APP_ID: Joi.string().allow("").optional(),
  WECHAT_APP_SECRET: Joi.string().allow("").optional(),
  WECHAT_ENV_VERSION: Joi.string().valid("develop", "trial", "release").default("release"),
  BABY_RECORD_SESSION_DAYS: Joi.number().integer().min(1).max(365).default(30),
  BABY_RECORD_COOKIE_SECURE: Joi.boolean().optional(),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_URL: Joi.string().optional().allow(''),
});
