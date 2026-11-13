import { Global, Module } from '@nestjs/common';
import { NOMBRES_LOOKUP } from './domain/lookup/nombres.port';
import { AppLogger } from './infrastructure/logging/logger.service';
import { SqlNombresLookup } from './infrastructure/lookup/sql-nombres.lookup';
import { LocalStorageAdapter } from './infrastructure/storage/local-storage.adapter';
import { STORAGE_PORT } from './infrastructure/storage/storage.port';

/**
 * Infraestructura transversal disponible para todos los modulos sin que cada
 * uno tenga que importarla: evita diez cambios cuando se sustituye un adaptador.
 */
@Global()
@Module({
  providers: [
    AppLogger,
    { provide: STORAGE_PORT, useClass: LocalStorageAdapter },
    { provide: NOMBRES_LOOKUP, useClass: SqlNombresLookup },
  ],
  exports: [AppLogger, STORAGE_PORT, NOMBRES_LOOKUP],
})
export class SharedModule {}
