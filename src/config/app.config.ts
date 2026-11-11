import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4200',
  storagePath: process.env.STORAGE_PATH ?? './storage/carteles',
  isProduction: process.env.NODE_ENV === 'production',
}));
