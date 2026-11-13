import { DomainError } from '../../../shared/domain/errors/domain.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import { EstadoCriminal } from '../../criminales/domain/estado-criminal.enum';
import {
  EstadoOperativo,
  PrioridadOperativo,
  RolParticipacion,
} from '../domain/estado-operativo.enum';
import { CrearOperativoUseCase, type CrearOperativoInput } from './crear-operativo.use-case';
import {
  OperativosEnMemoria,
  ReferenciasFalsas,
  eventosFalsos,
  lectorCriminales,
  resumenCriminal,
} from './testing/dobles-operativos';

const BASE: CrearOperativoInput = {
  nombre: 'Captura en Wano',
  objetivoCriminalId: 'c-luffy',
  fechaInicioPlaneada: new Date('2026-11-20T00:00:00Z'),
  prioridad: PrioridadOperativo.ALTA,
  usuarioId: 'u-coordinador',
  alcanceBaseId: null,
};

function preparar(criminales = [resumenCriminal()]): {
  useCase: CrearOperativoUseCase;
  repo: OperativosEnMemoria;
  emitidos: Array<{ nombre: string; datos: unknown }>;
} {
  const repo = new OperativosEnMemoria();
  const { emisor, emitidos } = eventosFalsos();
  const useCase = new CrearOperativoUseCase(
    repo,
    new ReferenciasFalsas(),
    lectorCriminales(criminales),
    emisor,
  );
  return { useCase, repo, emitidos };
}

describe('CrearOperativoUseCase', () => {
  it('crea el operativo PLANIFICADO con codigo, zona del criminal y base lider sugerida', async () => {
    const { useCase, repo } = preparar();

    const operativo = await useCase.execute(BASE);

    expect(operativo.codigo).toMatch(/^OP-\d{4}-0001$/);
    expect(operativo.estado).toBe(EstadoOperativo.PLANIFICADO);
    expect(operativo.zonaInfluenciaId).toBe('z-wano');
    expect(operativo.baseLiderId).toBe('b-g5');
    expect(repo.participacionesGuardadas[0].rolParticipacion).toBe(RolParticipacion.LIDER);
  });

  it('publica OPERATIVO_ACTUALIZADO (CREADO) con las bases involucradas', async () => {
    const { useCase, emitidos } = preparar();
    await useCase.execute(BASE);

    expect(emitidos[0].nombre).toBe(EVENTOS.OPERATIVO_ACTUALIZADO);
    expect(emitidos[0].datos).toMatchObject({ cambio: 'CREADO', basesIds: ['b-g5'] });
  });

  it('rechaza un criminal inexistente', async () => {
    const { useCase } = preparar([]);
    await expect(useCase.execute(BASE)).rejects.toThrow(NotFoundError);
  });

  it('no planea capturas sobre un criminal ya capturado', async () => {
    const { useCase } = preparar([resumenCriminal({ estado: EstadoCriminal.CAPTURADO })]);
    await expect(useCase.execute(BASE)).rejects.toThrow(DomainError);
  });

  it('rechaza una base lider inactiva', async () => {
    const { useCase } = preparar();
    await expect(useCase.execute({ ...BASE, baseLiderId: 'b-cerrada' })).rejects.toThrow(
      DomainError,
    );
  });

  it('un capitan lidera desde su propia base y no desde otra', async () => {
    const { useCase } = preparar();
    const propio = await useCase.execute({ ...BASE, alcanceBaseId: 'b-loguetown' });
    expect(propio.baseLiderId).toBe('b-loguetown');

    await expect(
      useCase.execute({ ...BASE, alcanceBaseId: 'b-loguetown', baseLiderId: 'b-g5' }),
    ).rejects.toThrow(ForbiddenError);
  });
});
