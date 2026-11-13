import { ConcurrencyError } from '../../../shared/domain/errors/concurrency.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import {
  EstadoOperativo,
  PrioridadOperativo,
  ResultadoOperativo,
} from '../domain/estado-operativo.enum';
import { CambiarEstadoOperativoUseCase } from './cambiar-estado-operativo.use-case';
import { CambiarPrioridadOperativoUseCase } from './cambiar-prioridad-operativo.use-case';
import { CerrarOperativoUseCase } from './cerrar-operativo.use-case';
import { ObtenerOperativoUseCase } from './obtener-operativo.use-case';
import { TableroOperativosUseCase } from './tablero-operativos.use-case';
import {
  CAPITAN_LOGUETOWN,
  COORDINADOR_GLOBAL,
  OperativosEnMemoria,
  eventosFalsos,
  lectorCriminales,
  operativoDePrueba,
  resumenCriminal,
} from './testing/dobles-operativos';

function preparar(): {
  repo: OperativosEnMemoria;
  emitidos: Array<{ nombre: string; datos: unknown }>;
  estado: CambiarEstadoOperativoUseCase;
  prioridad: CambiarPrioridadOperativoUseCase;
  cerrar: CerrarOperativoUseCase;
} {
  const repo = new OperativosEnMemoria();
  repo.operativos.set('op-1', operativoDePrueba());
  const { emisor, emitidos } = eventosFalsos();
  return {
    repo,
    emitidos,
    estado: new CambiarEstadoOperativoUseCase(repo, emisor),
    prioridad: new CambiarPrioridadOperativoUseCase(repo, emisor),
    cerrar: new CerrarOperativoUseCase(repo, emisor),
  };
}

describe('cambios de estado, prioridad y cierre', () => {
  it('inicia el operativo, sube la version y avisa a las bases', async () => {
    const { estado, emitidos } = preparar();
    const operativo = await estado.execute({
      operativoId: 'op-1',
      estado: EstadoOperativo.EN_CURSO,
      version: 1,
      usuario: COORDINADOR_GLOBAL,
    });

    expect(operativo.estado).toBe(EstadoOperativo.EN_CURSO);
    expect(operativo.version).toBe(2);
    expect(emitidos[0].datos).toMatchObject({ cambio: 'ESTADO', estado: 'EN_CURSO' });
  });

  it('responde conflicto si la version leida esta desactualizada', async () => {
    const { estado } = preparar();
    await expect(
      estado.execute({
        operativoId: 'op-1',
        estado: EstadoOperativo.EN_CURSO,
        version: 7,
        usuario: COORDINADOR_GLOBAL,
      }),
    ).rejects.toThrow(ConcurrencyError);
  });

  it('cambia la prioridad y no emite si es la misma', async () => {
    const { prioridad, emitidos } = preparar();
    await prioridad.execute({
      operativoId: 'op-1',
      prioridad: PrioridadOperativo.MEDIA,
      version: 1,
      usuario: COORDINADOR_GLOBAL,
    });
    expect(emitidos).toHaveLength(0);

    await prioridad.execute({
      operativoId: 'op-1',
      prioridad: PrioridadOperativo.CRITICA,
      version: 1,
      usuario: COORDINADOR_GLOBAL,
    });
    expect(emitidos[0].datos).toMatchObject({ cambio: 'PRIORIDAD', prioridad: 'CRITICA' });
  });

  it('cierra con resultado final y observaciones', async () => {
    const { cerrar, repo, emitidos } = preparar();
    repo.operativos.set('op-1', operativoDePrueba({ estado: EstadoOperativo.EN_CURSO }));

    const operativo = await cerrar.execute({
      operativoId: 'op-1',
      resultado: ResultadoOperativo.EXITOSO,
      observaciones: '  Objetivo capturado  ',
      version: 1,
      usuario: COORDINADOR_GLOBAL,
    });

    expect(operativo.estado).toBe(EstadoOperativo.CERRADO);
    expect(operativo.observacionesCierre).toBe('Objetivo capturado');
    expect(emitidos[0].datos).toMatchObject({ cambio: 'CERRADO' });
  });
});

describe('consultas', () => {
  it('el tablero impone el alcance de la base del usuario', async () => {
    const repo = new OperativosEnMemoria();
    const tablero = new TableroOperativosUseCase(repo);
    const filtro = { page: 1, limit: 20, order: 'DESC' as const };

    await tablero.execute({ filtro, usuario: CAPITAN_LOGUETOWN });
    expect(repo.ultimoFiltro?.alcanceBaseId).toBe('b-loguetown');

    await tablero.execute({ filtro, usuario: COORDINADOR_GLOBAL });
    expect(repo.ultimoFiltro?.alcanceBaseId).toBeNull();
  });

  it('el detalle trae el criminal objetivo y los incidentes vinculados', async () => {
    const repo = new OperativosEnMemoria();
    repo.operativos.set('op-1', operativoDePrueba());
    const obtener = new ObtenerOperativoUseCase(repo, lectorCriminales([resumenCriminal()]));

    const detalle = await obtener.execute({ id: 'op-1', usuario: COORDINADOR_GLOBAL });
    expect(detalle.criminal?.nombre).toBe('Monkey D. Luffy');
    expect(detalle.incidentesVinculados).toBe(2);

    await expect(obtener.execute({ id: 'op-1', usuario: CAPITAN_LOGUETOWN })).rejects.toThrow(
      ForbiddenError,
    );
  });
});
