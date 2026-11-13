import { DomainError } from '../../../shared/domain/errors/domain.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EstadoOperativo, RolParticipacion } from '../domain/estado-operativo.enum';
import { AsignarBasesUseCase } from './asignar-bases.use-case';
import { AsignarResponsablesUseCase } from './asignar-responsables.use-case';
import {
  CAPITAN_LOGUETOWN,
  COORDINADOR_GLOBAL,
  OperativosEnMemoria,
  ReferenciasFalsas,
  eventosFalsos,
  operativoDePrueba,
} from './testing/dobles-operativos';

function preparar(): {
  bases: AsignarBasesUseCase;
  responsables: AsignarResponsablesUseCase;
  repo: OperativosEnMemoria;
  emitidos: Array<{ nombre: string; datos: unknown }>;
} {
  const repo = new OperativosEnMemoria();
  repo.operativos.set('op-1', operativoDePrueba());
  const { emisor, emitidos } = eventosFalsos();
  const refs = new ReferenciasFalsas();
  return {
    bases: new AsignarBasesUseCase(repo, refs, emisor),
    responsables: new AsignarResponsablesUseCase(repo, refs, emisor),
    repo,
    emitidos,
  };
}

describe('AsignarBasesUseCase', () => {
  it('agrega una base de apoyo con recursos y avisa a todas las bases', async () => {
    const { bases, emitidos } = preparar();

    const operativo = await bases.execute({
      operativoId: 'op-1',
      bases: [
        {
          baseNavalId: 'b-loguetown',
          rolParticipacion: RolParticipacion.BLOQUEO,
          unidadesAsignadas: 4,
          recursos: '2 buques',
        },
      ],
      usuario: COORDINADOR_GLOBAL,
    });

    expect(operativo.basesInvolucradas().sort()).toEqual(['b-g5', 'b-loguetown']);
    expect(emitidos[0].datos).toMatchObject({ cambio: 'BASES' });
  });

  it('reserva el rol LIDER a la base lider', async () => {
    const { bases } = preparar();
    await expect(
      bases.execute({
        operativoId: 'op-1',
        bases: [{ baseNavalId: 'b-loguetown', rolParticipacion: RolParticipacion.LIDER }],
        usuario: COORDINADOR_GLOBAL,
      }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza bases inexistentes o inactivas', async () => {
    const { bases } = preparar();
    const pedir = (baseNavalId: string): Promise<unknown> =>
      bases.execute({
        operativoId: 'op-1',
        bases: [{ baseNavalId, rolParticipacion: RolParticipacion.APOYO }],
        usuario: COORDINADOR_GLOBAL,
      });
    await expect(pedir('b-nada')).rejects.toThrow(NotFoundError);
    await expect(pedir('b-cerrada')).rejects.toThrow(DomainError);
  });

  it('un capitan no modifica operativos donde su base no participa', async () => {
    const { bases } = preparar();
    await expect(
      bases.execute({
        operativoId: 'op-1',
        bases: [{ baseNavalId: 'b-loguetown', rolParticipacion: RolParticipacion.APOYO }],
        usuario: CAPITAN_LOGUETOWN,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('no asigna bases a un operativo finalizado', async () => {
    const { bases, repo } = preparar();
    repo.operativos.set('op-1', operativoDePrueba({ estado: EstadoOperativo.CERRADO }));
    await expect(
      bases.execute({
        operativoId: 'op-1',
        bases: [{ baseNavalId: 'b-loguetown', rolParticipacion: RolParticipacion.APOYO }],
        usuario: COORDINADOR_GLOBAL,
      }),
    ).rejects.toThrow(DomainError);
  });
});

describe('AsignarResponsablesUseCase', () => {
  it('asigna usuarios activos y no duplica al reasignar', async () => {
    const { responsables } = preparar();
    await responsables.execute({
      operativoId: 'op-1',
      responsables: [{ usuarioId: 'u-capitan', funcion: 'Comandante' }],
      usuario: COORDINADOR_GLOBAL,
    });
    const operativo = await responsables.execute({
      operativoId: 'op-1',
      responsables: [{ usuarioId: 'u-capitan', funcion: 'Enlace' }],
      usuario: COORDINADOR_GLOBAL,
    });

    expect(operativo.responsables).toHaveLength(1);
    expect(operativo.responsables?.[0].funcion).toBe('Enlace');
  });

  it('rechaza usuarios inexistentes', async () => {
    const { responsables } = preparar();
    await expect(
      responsables.execute({
        operativoId: 'op-1',
        responsables: [{ usuarioId: 'u-fantasma' }],
        usuario: COORDINADOR_GLOBAL,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
