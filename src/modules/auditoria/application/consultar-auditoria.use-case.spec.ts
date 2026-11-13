import { PageResult } from '../../../shared/application/pagination/page-result';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import type { Auditoria } from '../domain/auditoria.entity';
import type { AuditoriaRepositoryPort, FiltroAuditoria } from '../domain/auditoria.repository.port';
import { ConsultarAuditoriaUseCase } from './consultar-auditoria.use-case';

class BitacoraEnMemoria implements AuditoriaRepositoryPort {
  ultimoFiltro: FiltroAuditoria | null = null;

  listar(filtro: FiltroAuditoria): Promise<PageResult<Auditoria>> {
    this.ultimoFiltro = filtro;
    return Promise.resolve(new PageResult<Auditoria>([], 0, filtro.page, filtro.limit));
  }
}

const BASE: FiltroAuditoria = { page: 1, limit: 20, order: 'DESC' };

describe('ConsultarAuditoriaUseCase', () => {
  it('delega el filtro al repositorio', async () => {
    const repo = new BitacoraEnMemoria();
    const filtro = { ...BASE, usuarioId: 'u-almirante', entidad: 'recompensa' };

    await new ConsultarAuditoriaUseCase(repo).execute(filtro);

    expect(repo.ultimoFiltro).toEqual(filtro);
  });

  it('rechaza un rango de fechas invertido', () => {
    const useCase = new ConsultarAuditoriaUseCase(new BitacoraEnMemoria());

    expect(() =>
      useCase.execute({ ...BASE, desde: new Date('2026-12-01'), hasta: new Date('2026-01-01') }),
    ).toThrow(DomainError);
  });
});
