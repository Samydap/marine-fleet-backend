import { EVENTOS } from '../../../shared/domain/events/domain-event';
import { EstadoVerificacion, OrigenAvistamiento } from '../domain/avistamiento.entity';
import { EstadoReporte } from '../domain/reporte-ciudadano.entity';
import {
  criminalesFalsos,
  emisorFalso,
  ReportesEnMemoria,
  zonasFalsas,
} from '../test-utils/dobles-inteligencia';
import { RegistrarReporteCiudadanoUseCase } from './registrar-reporte-ciudadano.use-case';
import { RevisarReporteUseCase } from './revisar-reporte.use-case';

const REPORTE = {
  criminalId: 'c-luffy',
  descripcion: 'Lo vi comiendo carne en el puerto.',
  ubicacion: 'Puerto de Loguetown',
  fechaHecho: '2026-11-05T11:00',
  zonaInfluenciaId: 'z-loguetown',
  nombre: 'Vendedor',
  contacto: '555-0101',
  anonimo: false,
};

function crear(): {
  repo: ReportesEnMemoria;
  registrar: RegistrarReporteCiudadanoUseCase;
  revisar: RevisarReporteUseCase;
  eventos: ReturnType<typeof emisorFalso>;
} {
  const repo = new ReportesEnMemoria();
  const eventos = emisorFalso();
  return {
    repo,
    eventos,
    registrar: new RegistrarReporteCiudadanoUseCase(repo, criminalesFalsos, zonasFalsas, eventos),
    revisar: new RevisarReporteUseCase(repo, eventos),
  };
}

describe('Reportes ciudadanos', () => {
  it('entra PENDIENTE y al ciudadano solo se le devuelve id, estado y mensaje', async () => {
    const { registrar, eventos } = crear();
    const recibido = await registrar.execute(REPORTE);

    expect(Object.keys(recibido).sort()).toEqual(['estado', 'id', 'mensaje']);
    expect(recibido.estado).toBe(EstadoReporte.PENDIENTE);
    expect(eventos.emitidos).toEqual([EVENTOS.REPORTE_RECIBIDO]);
  });

  it('con anonimato no guarda nombre ni contacto', async () => {
    const { registrar, repo } = crear();
    await registrar.execute({ ...REPORTE, anonimo: true });
    expect(repo.datos[0].informante).toEqual({ anonimo: true });
  });

  it('aprobar crea el avistamiento oficial verificado y emite los dos eventos', async () => {
    const { registrar, revisar, repo, eventos } = crear();
    const { id } = await registrar.execute(REPORTE);

    const { reporte, avistamientoId } = await revisar.execute({
      reporteId: id,
      decision: EstadoReporte.APROBADO,
      usuarioId: 'u-director',
    });

    const avistamiento = repo.avistamientosCreados[0];
    expect(reporte.estado).toBe(EstadoReporte.APROBADO);
    expect(reporte.avistamientoId).toBe(avistamientoId);
    expect(avistamiento.origen).toBe(OrigenAvistamiento.REPORTE_CIUDADANO);
    expect(avistamiento.estadoVerificacion).toBe(EstadoVerificacion.VERIFICADO);
    expect(avistamiento.testigo).toBe('Vendedor');
    expect(eventos.emitidos).toContain(EVENTOS.REPORTE_APROBADO);
    expect(eventos.emitidos).toContain(EVENTOS.AVISTAMIENTO_REGISTRADO);
  });

  it('rechazar exige motivo y no crea avistamiento', async () => {
    const { registrar, revisar, repo } = crear();
    const { id } = await registrar.execute(REPORTE);

    await expect(
      revisar.execute({ reporteId: id, decision: EstadoReporte.RECHAZADO, usuarioId: 'u' }),
    ).rejects.toThrow('motivo');

    await revisar.execute({
      reporteId: id,
      decision: EstadoReporte.RECHAZADO,
      motivoRechazo: 'Falso',
      usuarioId: 'u',
    });
    expect(repo.avistamientosCreados).toHaveLength(0);
  });

  it('un reporte ya revisado no se vuelve a revisar', async () => {
    const { registrar, revisar } = crear();
    const { id } = await registrar.execute(REPORTE);
    await revisar.execute({ reporteId: id, decision: EstadoReporte.APROBADO, usuarioId: 'u' });

    await expect(
      revisar.execute({ reporteId: id, decision: EstadoReporte.APROBADO, usuarioId: 'u' }),
    ).rejects.toThrow('ya fue revisado');
  });
});
