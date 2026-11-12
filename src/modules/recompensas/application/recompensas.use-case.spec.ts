import { EventEmitter2 } from '@nestjs/event-emitter';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import type {
  CriminalReaderPort,
  CriminalResumen,
} from '../../criminales/domain/criminal.repository.port';
import { EstadoCriminal } from '../../criminales/domain/estado-criminal.enum';
import { EstadoRecompensa } from '../domain/estado-recompensa.enum';
import type { Recompensa } from '../domain/recompensa.entity';
import type { RecompensaRepositoryPort } from '../domain/recompensa.repository.port';
import { ActivarRecompensaService } from './activar-recompensa.service';
import { SolicitarRecompensaUseCase } from './solicitar-recompensa.use-case';
import { ValidarRecompensaUseCase } from './validar-recompensa.use-case';

class RecompensasEnMemoria implements RecompensaRepositoryPort {
  readonly datos: Recompensa[] = [];
  buscarPorId(id: string): Promise<Recompensa | null> {
    return Promise.resolve(this.datos.find((r) => r.id === id) ?? null);
  }
  buscarVigente(criminalId: string): Promise<Recompensa | null> {
    return this.buscar(criminalId, EstadoRecompensa.VIGENTE);
  }
  buscarPendiente(criminalId: string): Promise<Recompensa | null> {
    return this.buscar(criminalId, EstadoRecompensa.PENDIENTE_VALIDACION);
  }
  listar(): Promise<PageResult<Recompensa>> {
    return Promise.resolve(new PageResult(this.datos, this.datos.length, 1, 20));
  }
  historialPorCriminal(criminalId: string): Promise<Recompensa[]> {
    return Promise.resolve(this.datos.filter((r) => r.criminalId === criminalId));
  }
  guardar(r: Recompensa): Promise<Recompensa> {
    if (!this.datos.includes(r)) this.datos.push(r);
    return Promise.resolve(r);
  }
  async activarReemplazandoVigente(nueva: Recompensa): Promise<Recompensa | null> {
    const anterior = this.datos.find(
      (r) =>
        r.criminalId === nueva.criminalId && r.estado === EstadoRecompensa.VIGENTE && r !== nueva,
    );
    anterior?.pasarAHistorica();
    await this.guardar(nueva);
    return anterior ?? null;
  }
  private buscar(criminalId: string, estado: EstadoRecompensa): Promise<Recompensa | null> {
    return Promise.resolve(
      this.datos.find((r) => r.criminalId === criminalId && r.estado === estado) ?? null,
    );
  }
}

function lector(estado = EstadoCriminal.ACTIVO): CriminalReaderPort {
  const resumen: CriminalResumen = {
    id: 'c-nami',
    nombre: 'Nami',
    alias: [],
    estado,
    nivelAmenaza: NivelAmenaza.BAJO,
    recompensaVigenteMonto: 66_000_000,
    zonaInfluenciaId: null,
    fotoUrl: null,
    organizacion: null,
  };
  return {
    obtenerResumen: (id) => Promise.resolve(id === 'c-nami' ? resumen : null),
    existe: (id) => Promise.resolve(id === 'c-nami'),
    obtenerResumenes: () => Promise.resolve([resumen]),
    listarTodosLosIds: () => Promise.resolve(['c-nami']),
    contarPorNivelAmenaza: () => Promise.resolve([]),
  };
}

describe('Recompensas', () => {
  let repo: RecompensasEnMemoria;
  let eventos: EventEmitter2;
  let solicitar: SolicitarRecompensaUseCase;
  let validar: ValidarRecompensaUseCase;
  const ANALISTA = { usuarioId: 'u-analista', permisos: [Permiso.RECOMPENSAS_SOLICITAR] };
  const ALMIRANTE = { usuarioId: 'u-almirante', permisos: [Permiso.TODO] };

  beforeEach(() => {
    repo = new RecompensasEnMemoria();
    eventos = new EventEmitter2();
    const activador = new ActivarRecompensaService(repo, eventos);
    solicitar = new SolicitarRecompensaUseCase(repo, lector(), activador, eventos);
    validar = new ValidarRecompensaUseCase(repo, activador, lector());
  });

  it('un monto por debajo del umbral queda VIGENTE y emite recompensa.vigente', async () => {
    const espia = jest.spyOn(eventos, 'emitAsync');
    const r = await solicitar.execute({ criminalId: 'c-nami', monto: 366_000_000, ...ANALISTA });

    expect(r.estado).toBe(EstadoRecompensa.VIGENTE);
    expect(r.requiereValidacion).toBe(false);
    expect(espia).toHaveBeenCalledWith(
      'recompensa.vigente',
      expect.objectContaining({ monto: 366_000_000 }),
    );
  });

  it('la vigente anterior pasa a HISTORICA, nunca se borra', async () => {
    const primera = await solicitar.execute({
      criminalId: 'c-nami',
      monto: 16_000_000,
      ...ANALISTA,
    });
    await solicitar.execute({ criminalId: 'c-nami', monto: 66_000_000, ...ANALISTA });

    expect(primera.estado).toBe(EstadoRecompensa.HISTORICA);
    expect(primera.vigenteHasta).toBeInstanceOf(Date);
    expect(repo.datos).toHaveLength(2);
  });

  it('un monto de alto rango queda PENDIENTE sin emitir recompensa.vigente', async () => {
    const espia = jest.spyOn(eventos, 'emitAsync');
    const r = await solicitar.execute({ criminalId: 'c-nami', monto: 1_000_000_000, ...ANALISTA });

    expect(r.estado).toBe(EstadoRecompensa.PENDIENTE_VALIDACION);
    expect(espia).not.toHaveBeenCalledWith('recompensa.vigente', expect.anything());
  });

  it('aunque la solicite el Almirante, la de alto rango queda pendiente (regla de dos personas)', async () => {
    const r = await solicitar.execute({ criminalId: 'c-nami', monto: 2_000_000_000, ...ALMIRANTE });
    expect(r.estado).toBe(EstadoRecompensa.PENDIENTE_VALIDACION);
    expect(r.validadaPor).toBeNull();
  });

  it('no admite dos solicitudes pendientes para el mismo criminal', async () => {
    await solicitar.execute({ criminalId: 'c-nami', monto: 1_500_000_000, ...ANALISTA });
    await expect(
      solicitar.execute({ criminalId: 'c-nami', monto: 1_600_000_000, ...ANALISTA }),
    ).rejects.toThrow(DomainError);
  });

  it('no emite recompensa para un criminal capturado', async () => {
    const activador = new ActivarRecompensaService(repo, eventos);
    const uc = new SolicitarRecompensaUseCase(
      repo,
      lector(EstadoCriminal.CAPTURADO),
      activador,
      eventos,
    );
    await expect(uc.execute({ criminalId: 'c-nami', monto: 10, ...ANALISTA })).rejects.toThrow(
      'CAPTURADO',
    );
  });

  it('el Almirante aprueba una pendiente y queda VIGENTE', async () => {
    const r = await solicitar.execute({ criminalId: 'c-nami', monto: 1_500_000_000, ...ANALISTA });
    const validada = await validar.execute({ recompensaId: r.id, aprobar: true, ...ALMIRANTE });

    expect(validada.estado).toBe(EstadoRecompensa.VIGENTE);
    expect(validada.validadaPor).toBe('u-almirante');
  });

  it('rechazar exige motivo', async () => {
    const r = await solicitar.execute({ criminalId: 'c-nami', monto: 1_500_000_000, ...ANALISTA });
    await expect(
      validar.execute({ recompensaId: r.id, aprobar: false, ...ALMIRANTE }),
    ).rejects.toThrow('motivo');
    const rechazada = await validar.execute({
      recompensaId: r.id,
      aprobar: false,
      motivo: 'Sin pruebas',
      ...ALMIRANTE,
    });
    expect(rechazada.estado).toBe(EstadoRecompensa.RECHAZADA);
  });

  it('quien no tiene RECOMPENSAS_VALIDAR no valida, aunque llegue al caso de uso', async () => {
    const r = await solicitar.execute({ criminalId: 'c-nami', monto: 1_500_000_000, ...ANALISTA });
    await expect(
      validar.execute({ recompensaId: r.id, aprobar: true, usuarioId: 'u-otro', permisos: [] }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('quien solicita no puede validar su propia solicitud', async () => {
    const r = await solicitar.execute({ criminalId: 'c-nami', monto: 1_500_000_000, ...ANALISTA });
    await expect(
      validar.execute({
        recompensaId: r.id,
        aprobar: true,
        usuarioId: 'u-analista',
        permisos: [Permiso.TODO],
      }),
    ).rejects.toThrow('no puede validarla');
  });
});
