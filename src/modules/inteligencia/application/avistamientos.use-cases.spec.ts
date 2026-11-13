import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import { EstadoVerificacion } from '../domain/avistamiento.entity';
import {
  AvistamientosEnMemoria,
  criminalesFalsos,
  emisorFalso,
  zonasFalsas,
} from '../test-utils/dobles-inteligencia';
import { ActualizarAvistamientoUseCase } from './actualizar-avistamiento.use-case';
import { ConsultarAvistamientosUseCase } from './consultar-avistamientos.use-case';
import { EliminarAvistamientoUseCase } from './eliminar-avistamiento.use-case';
import { RegistrarAvistamientoUseCase } from './registrar-avistamiento.use-case';
import { VerificarAvistamientoUseCase } from './verificar-avistamiento.use-case';

const DATOS = {
  criminalId: 'c-luffy',
  fechaHora: '2026-11-01T10:00',
  ubicacion: '  Costa de Wano  ',
  testigo: 'Patrulla G-5',
  zonaInfluenciaId: 'z-wano',
  usuarioId: 'u-director',
};

function crear(): {
  repo: AvistamientosEnMemoria;
  registrar: RegistrarAvistamientoUseCase;
  eventos: ReturnType<typeof emisorFalso>;
} {
  const repo = new AvistamientosEnMemoria();
  const eventos = emisorFalso();
  return {
    repo,
    eventos,
    registrar: new RegistrarAvistamientoUseCase(repo, criminalesFalsos, zonasFalsas, eventos),
  };
}

describe('Casos de uso de avistamientos', () => {
  it('registra PENDIENTE y OFICIAL, con el nombre del criminal, y emite el evento', async () => {
    const { registrar, eventos } = crear();

    const { avistamiento, criminalNombre } = await registrar.execute(DATOS);

    expect(avistamiento.estadoVerificacion).toBe(EstadoVerificacion.PENDIENTE);
    expect(avistamiento.origen).toBe('OFICIAL');
    expect(avistamiento.ubicacion).toBe('Costa de Wano');
    expect(criminalNombre).toBe('Monkey D. Luffy');
    expect(eventos.emitidos).toEqual([EVENTOS.AVISTAMIENTO_REGISTRADO]);
  });

  it('rechaza un criminal inexistente y una zona inexistente', async () => {
    const { registrar } = crear();
    await expect(registrar.execute({ ...DATOS, criminalId: 'c-nadie' })).rejects.toThrow(
      NotFoundError,
    );
    await expect(registrar.execute({ ...DATOS, zonaInfluenciaId: 'z-atlantida' })).rejects.toThrow(
      'no existe',
    );
  });

  it('verifica y luego impide editar o eliminar el avistamiento verificado', async () => {
    const { registrar, repo } = crear();
    const { avistamiento } = await registrar.execute(DATOS);

    await new VerificarAvistamientoUseCase(repo).execute({
      id: avistamiento.id,
      estado: EstadoVerificacion.VERIFICADO,
      usuarioId: 'u-director',
    });

    const editar = new ActualizarAvistamientoUseCase(repo, criminalesFalsos, zonasFalsas);
    await expect(editar.execute({ ...DATOS, id: avistamiento.id })).rejects.toThrow(DomainError);
    await expect(new EliminarAvistamientoUseCase(repo).execute(avistamiento.id)).rejects.toThrow(
      'descartalo primero',
    );
  });

  it('un avistamiento descartado si se puede eliminar', async () => {
    const { registrar, repo } = crear();
    const { avistamiento } = await registrar.execute(DATOS);
    const verificar = new VerificarAvistamientoUseCase(repo);
    await verificar.execute({
      id: avistamiento.id,
      estado: EstadoVerificacion.DESCARTADO,
      usuarioId: 'u',
    });

    await new EliminarAvistamientoUseCase(repo).execute(avistamiento.id);

    expect(repo.datos).toHaveLength(0);
  });

  it('no deja verificar dos veces con el mismo estado', async () => {
    const { registrar, repo } = crear();
    const { avistamiento } = await registrar.execute(DATOS);
    const verificar = new VerificarAvistamientoUseCase(repo);
    await verificar.execute({
      id: avistamiento.id,
      estado: EstadoVerificacion.VERIFICADO,
      usuarioId: 'u',
    });

    await expect(
      verificar.execute({
        id: avistamiento.id,
        estado: EstadoVerificacion.VERIFICADO,
        usuarioId: 'u',
      }),
    ).rejects.toThrow('ya esta');
  });

  it('rechaza un rango de fechas invertido', () => {
    const consultar = new ConsultarAvistamientosUseCase(new AvistamientosEnMemoria());
    expect(() =>
      consultar.execute({
        desde: new Date('2026-11-02'),
        hasta: new Date('2026-11-01'),
        page: 1,
        limit: 20,
        order: 'DESC',
      }),
    ).toThrow('posterior');
  });
});
