import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

/**
 * DataSource exclusivo para el CLI de TypeORM (generar y correr migraciones).
 * La aplicacion usa TypeOrmModule con database.config.ts; este archivo existe
 * porque el CLI no pasa por el contenedor de NestJS.
 */
loadEnv();

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'marina_inteligencia',
  charset: 'utf8mb4',
  synchronize: false,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/shared/infrastructure/database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
