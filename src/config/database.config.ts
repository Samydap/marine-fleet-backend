import { registerAs } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  timezone: 'Z',

  // El esquema vive en migraciones versionadas. NUNCA poner esto en true:
  // TypeORM alteraria el esquema real y destruiria el trigger de historial.
  synchronize: false,

  autoLoadEntities: true,
  migrationsRun: false,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'migration'] : ['error'],
  extra: {
    connectionLimit: 10,
    decimalNumbers: true,
  },
}));
