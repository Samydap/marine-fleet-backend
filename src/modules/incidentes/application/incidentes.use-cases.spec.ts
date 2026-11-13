import { PageResult } from '../../../shared/application/pagination/page-result';
import { ConcurrencyError } from '../../../shared/domain/errors/concurrency.error';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { EstadoOperativo } from '../../operativos/domain/estado-operativo.enum';
import type { OperativoReaderPort } from '../../operativos/domain/operativo.repository.port';
import {
  eventosFalsos,
  lectorCriminales,
  resumenCriminal,
} from '../../operativos/application/testing/dobles-operativos';
import type { Incidente } from '../domain/incidente.entity';
import type {
  FiltroIncidentes,
  IncidenteRepositoryPort,
} from '../domain/incidente.repository.port';
import type { Participante } from '../domain/participante.entity';
import {
  DesenlaceParticipante,
  ResultadoEnfrentamiento,
} from '../domain/resultado-enfrentamiento.enum';
import { CerrarIncidenteUseCase } from './cerrar-incidente.use-case';
import { CorregirIncidenteUseCase } from './corregir-incidente.use-case';
import { HistorialIncidentesUseCase } from './historial-incidentes.use-case';
import type { UsuarioIncidente } from './incidente-helpers';
import {
  RegistrarIncidenteUseCase,
  type RegistrarIncidenteInput,
} from './registrar-incidente.use-case';
import { VincularOperativoUseCase } from './vincular-operativo.use-case';

class IncidentesEnMemoria implements IncidenteRepositoryPort {
  readonly incidentes = new Map<string, Incidente>();
  ultimoFiltro: FiltroIncidentes | null = null;
  participantesGuardados: Participante[] = [];

  buscarPorId(id: string): Promise<Incidente | null> {
    return Promise.resolve(this.incidentes.get(id) ?? null);
  }
  listar(filtro: FiltroIncidentes): Promise<PageResult<Incidente>> {
    this.ultimoFiltro = filtro;
    return Promise.resolve(new PageResult([...this.incidentes.values()], 0, 1, 20));
  }
  guardar(incidente: Incidente): Promise<Incidente> {
    incidente.version = Number(incidente.version ?? 0) + 1;
    this.incidentes.set(incidente.id, incidente);
    return Promise.resolve(incidente);
  }
  guardarParticipantes(participantes: Participante[]): Promise<void> {
    this.participantesGuardados = participantes;
    return Promise.resolve();
  }
}

const operativos: OperativoReaderPort = {
  obtenerResumen: (id) =>
    Promise.resolve(
      id === 'op-1'
        ? { id, codigo: 'OP-2026-0001', estado: EstadoOperativo.EN_CURSO, basesIds: ['b-g5'] }
        : null,
    ),
};

const GLOBAL: UsuarioIncidente = { id: 'u-almirante', permisos: [Permiso.TODO], baseNavalId: null };
const CAPITAN: UsuarioIncidente = {
  id: 'u-capitan',
  permisos: [Permiso.INCIDENTES_ESCRIBIR],
  baseNavalId: 'b-loguetown',
};

const ENTRADA: RegistrarIncidenteInput = {
  fechaHora: new Date('2026-11-10T15:00:00Z'),
  ubicacion: 'Muelle 3',
  descripcion: 'Enfrentamiento en el puerto',
  criminales: [{ criminalId: 'c-luffy' }, { criminalId: 'c-zoro' }],
  marinos: [{ nombre: 'Capitan Smoker', rango: 'Capitan' }],
  usuario: CAPITAN,
};

function preparar(): {
  repo: IncidentesEnMemoria;
  emitidos: Array<{ nombre: string; datos: unknown }>;
  registrar: RegistrarIncidenteUseCase;
  cerrar: CerrarIncidenteUseCase;
} {
  const repo = new IncidentesEnMemoria();
  const { emisor, emitidos } = eventosFalsos();
  const criminales = lectorCriminales([
    resumenCriminal(),
    resumenCriminal({ id: 'c-zoro', nombre: 'Roronoa Zoro' }),
  ]);
  return {
    repo,
    emitidos,
    registrar: new RegistrarIncidenteUseCase(repo, criminales, operativos, emisor),
    cerrar: new CerrarIncidenteUseCase(repo, emisor),
  };
}

describe('RegistrarIncidenteUseCase', () => {
  it('registra el enfrentamiento en la base del usuario con participantes de ambos bandos', async () => {
    const { registrar, emitidos } = preparar();
    const incidente = await registrar.execute(ENTRADA);

    expect(incidente.baseNavalId).toBe('b-loguetown');
    expect(incidente.zonaInfluenciaId).toBe('z-wano');
    expect(incidente.participantes).toHaveLength(2);
    expect(incidente.participantesMarina).toEqual([{ nombre: 'Capitan Smoker', rango: 'Capitan' }]);
    expect(incidente.resultado).toBe(ResultadoEnfrentamiento.EN_CURSO);
    expect(emitidos.map((e) => e.nombre)).toEqual([EVENTOS.INCIDENTE_REGISTRADO]);
  });

  it('si llega con resultado final, queda cerrado y publica INCIDENTE_CERRADO', async () => {
    const { registrar, emitidos } = preparar();
    await registrar.execute({
      ...ENTRADA,
      criminales: [{ criminalId: 'c-luffy', desenlace: DesenlaceParticipante.CAPTURADO }],
      resultado: ResultadoEnfrentamiento.EXITO,
    });

    expect(emitidos[1].nombre).toBe(EVENTOS.INCIDENTE_CERRADO);
    expect(emitidos[1].datos).toMatchObject({
      desenlaces: [{ criminalId: 'c-luffy', desenlace: 'CAPTURADO' }],
    });
  });

  it('valida criminales, repetidos, operativo y base propia', async () => {
    const { registrar } = preparar();
    await expect(
      registrar.execute({ ...ENTRADA, criminales: [{ criminalId: 'c-nadie' }] }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      registrar.execute({
        ...ENTRADA,
        criminales: [{ criminalId: 'c-luffy' }, { criminalId: 'c-luffy' }],
      }),
    ).rejects.toThrow(DomainError);
    await expect(registrar.execute({ ...ENTRADA, operativoId: 'op-x' })).rejects.toThrow(
      NotFoundError,
    );
    await expect(registrar.execute({ ...ENTRADA, baseNavalId: 'b-g5' })).rejects.toThrow(
      ForbiddenError,
    );
  });
});

describe('cierre, correccion, vinculo e historial', () => {
  it('cierra con desenlaces y publica INCIDENTE_CERRADO para Criminales', async () => {
    const { registrar, cerrar, emitidos } = preparar();
    const { id } = await registrar.execute(ENTRADA);

    const cerrado = await cerrar.execute({
      incidenteId: id,
      resultado: ResultadoEnfrentamiento.PARCIAL,
      desenlaces: [
        { criminalId: 'c-luffy', desenlace: DesenlaceParticipante.ESCAPO },
        { criminalId: 'c-zoro', desenlace: DesenlaceParticipante.CAPTURADO },
      ],
      version: 1,
      usuario: CAPITAN,
    });

    expect(cerrado.estaCerrado()).toBe(true);
    expect(emitidos.at(-1)?.datos).toMatchObject({
      resultado: 'PARCIAL',
      desenlaces: expect.arrayContaining([{ criminalId: 'c-zoro', desenlace: 'CAPTURADO' }]),
    });
  });

  it('no cierra dos veces ni acepta desenlaces de quien no participo', async () => {
    const { registrar, cerrar } = preparar();
    const { id } = await registrar.execute(ENTRADA);
    const cerrarCon = (criminalId: string, version: number): Promise<Incidente> =>
      cerrar.execute({
        incidenteId: id,
        resultado: ResultadoEnfrentamiento.EXITO,
        desenlaces: [{ criminalId, desenlace: DesenlaceParticipante.CAPTURADO }],
        version,
        usuario: GLOBAL,
      });

    await expect(cerrarCon('c-teach', 1)).rejects.toThrow(DomainError);
    await cerrarCon('c-luffy', 1);
    await expect(cerrarCon('c-luffy', 2)).rejects.toThrow(DomainError);
  });

  it('corrige datos descriptivos con concurrencia optimista', async () => {
    const { registrar, repo } = preparar();
    const { id } = await registrar.execute(ENTRADA);
    const corregir = new CorregirIncidenteUseCase(repo);

    const corregido = await corregir.execute({
      incidenteId: id,
      version: 1,
      cambios: { ubicacion: ' Muelle 4 ', bajasMarina: 3 },
      usuario: CAPITAN,
    });
    expect(corregido.ubicacion).toBe('Muelle 4');
    expect(corregido.bajasMarina).toBe(3);

    await expect(
      corregir.execute({ incidenteId: id, version: 1, cambios: {}, usuario: CAPITAN }),
    ).rejects.toThrow(ConcurrencyError);
  });

  it('vincula el enfrentamiento a un operativo existente', async () => {
    const { registrar, repo } = preparar();
    const { id } = await registrar.execute(ENTRADA);
    const vincular = new VincularOperativoUseCase(repo, operativos);

    const vinculado = await vincular.execute({
      incidenteId: id,
      operativoId: 'op-1',
      version: 1,
      usuario: GLOBAL,
    });
    expect(vinculado.operativoId).toBe('op-1');
    await expect(
      vincular.execute({ incidenteId: id, operativoId: 'op-x', version: 2, usuario: GLOBAL }),
    ).rejects.toThrow(NotFoundError);
  });

  it('el historial pasa el filtro tal cual al repositorio', async () => {
    const repo = new IncidentesEnMemoria();
    const filtro = { criminalId: 'c-luffy', page: 1, limit: 20, order: 'DESC' as const };
    await new HistorialIncidentesUseCase(repo).execute(filtro);
    expect(repo.ultimoFiltro).toEqual(filtro);
  });
});
