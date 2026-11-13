import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { SaludPort } from '../domain/sincronizacion.ports';

@Injectable()
export class TypeOrmSaludAdapter implements SaludPort {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async pingBaseDeDatos(): Promise<number> {
    const inicio = Date.now();
    await this.db.query('SELECT 1');
    return Date.now() - inicio;
  }
}
