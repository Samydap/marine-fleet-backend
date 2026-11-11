import * as Joi from 'joi';

/**
 * Valida el .env al arrancar. Sin esto, una variable mal puesta se manifiesta
 * como un error oscuro de conexion a mitad de una peticion en lugar de como un
 * fallo claro en el arranque.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),

  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().min(10).max(14).default(10),
  MAX_INTENTOS_FALLIDOS: Joi.number().min(3).default(5),

  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
  STORAGE_PATH: Joi.string().default('./storage/carteles'),
});
