import { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import type { ReportePdfPort, ReportesLecturaPort } from '../domain/reportes-lectura.port';
import type { Estadisticas, FilaRecompensasPorMar } from '../domain/reportes.types';
import { EstadisticasUseCase } from './estadisticas.use-case';
import { ExportarReporteUseCase } from './exportar-reporte.use-case';
import { ReporteRecompensasPorMarUseCase } from './reporte-recompensas-por-mar.use-case';
import { tablaRecompensasPorMar } from './tablas-reporte';
import { TendenciasUseCase } from './tendencias.use-case';

const FILAS: FilaRecompensasPorMar[] = [
  {
    marId: 'm-east-blue',
    marNombre: 'East Blue',
    tipoMar: 'CUATRO_MARES',
    totalAcumulado: 101_000_000,
    cantidadCriminales: 3,
  },
  {
    marId: 'm-grand-line',
    marNombre: 'Grand Line',
    tipoMar: 'GRAND_LINE',
    totalAcumulado: 3_000_000_000,
    cantidadCriminales: 1,
  },
];

class LecturaFalsa implements ReportesLecturaPort {
  instantaneas: Array<{ periodo: string; usuarioId: string | null }> = [];
  cortes: Date[] = [];
  recompensasPorMar(corte: Date): Promise<FilaRecompensasPorMar[]> {
    this.cortes.push(corte);
    return Promise.resolve(FILAS);
  }
  guardarInstantanea(
    periodo: string,
    _f: FilaRecompensasPorMar[],
    usuarioId: string | null,
  ): Promise<void> {
    this.instantaneas.push({ periodo, usuarioId });
    return Promise.resolve();
  }
  listarInstantaneas(): Promise<never[]> {
    return Promise.resolve([]);
  }
  tendencias(): Promise<never[]> {
    return Promise.resolve([]);
  }
  estadisticas(): Promise<Estadisticas> {
    return Promise.resolve({
      resumen: {
        criminalesActivos: 1,
        criminalesCapturados: 0,
        criminalesMuertos: 0,
        recompensaActivaTotal: 1,
        reportesPendientes: 0,
        avistamientosPendientes: 0,
        recompensasPorValidar: 0,
      },
      porNivelAmenaza: [{ etiqueta: NivelAmenaza.ALTO, valor: 4 }],
      porMar: [],
      porCategoria: [],
      porEstado: [{ etiqueta: 'ACTIVO', valor: 10 }],
      avistamientosPorMes: [],
    });
  }
}

describe('ReporteRecompensasPorMarUseCase', () => {
  it('suma el total de un mes cerrado SIN reescribir su instantanea', async () => {
    const lectura = new LecturaFalsa();
    const reporte = await new ReporteRecompensasPorMarUseCase(lectura).execute({
      periodo: '2026-10',
      usuarioId: 'u-analista',
    });

    expect(reporte.totalGeneral).toBe(3_101_000_000);
    expect(reporte.filas).toHaveLength(2);
    expect(lectura.instantaneas).toEqual([]);
    expect(lectura.cortes[0].toISOString()).toBe('2026-11-01T04:59:59.999Z');
  });

  it('sin periodo usa el mes en curso y guarda su instantanea', async () => {
    const lectura = new LecturaFalsa();
    const reporte = await new ReporteRecompensasPorMarUseCase(lectura).execute({
      usuarioId: 'u-analista',
    });
    expect(reporte.periodo).toMatch(/^\d{4}-\d{2}$/);
    expect(lectura.instantaneas).toEqual([{ periodo: reporte.periodo, usuarioId: 'u-analista' }]);
  });
});

describe('EstadisticasUseCase', () => {
  it('completa con cero las categorias sin datos y los 6 meses', async () => {
    const e = await new EstadisticasUseCase(new LecturaFalsa()).execute();

    expect(e.porNivelAmenaza.map((p) => p.etiqueta)).toEqual([
      'ALTO',
      'MEDIO',
      'BAJO',
      'PENDIENTE',
    ]);
    expect(e.porNivelAmenaza[0].valor).toBe(4);
    expect(e.porEstado).toEqual([
      { etiqueta: 'ACTIVO', valor: 10 },
      { etiqueta: 'CAPTURADO', valor: 0 },
      { etiqueta: 'MUERTO', valor: 0 },
    ]);
    expect(e.avistamientosPorMes).toHaveLength(6);
  });
});

describe('TendenciasUseCase', () => {
  it('informa la agrupacion y la ventana de 90 dias', async () => {
    const t = await new TendenciasUseCase(new LecturaFalsa()).execute('nivel');
    expect(t).toEqual({ agrupacion: 'nivel', ventanaDias: 90, filas: [] });
  });
});

describe('ExportarReporteUseCase', () => {
  const pdfFalso: ReportePdfPort = { generar: () => Promise.resolve(Buffer.from('%PDF-falso')) };
  const tabla = tablaRecompensasPorMar({
    periodo: '2026-11',
    fechaCorte: new Date(),
    filas: FILAS,
    totalGeneral: 3_101_000_000,
    generadoEn: new Date(),
  });

  it('CSV con nombre y mime correctos', async () => {
    const archivo = await new ExportarReporteUseCase(pdfFalso).execute(tabla, 'csv');
    expect(archivo.nombreArchivo).toBe('recompensas-por-mar-2026-11.csv');
    expect(archivo.mime).toContain('text/csv');
    expect(archivo.contenido.toString('utf8')).toContain('TOTAL;;4;3101000000');
  });

  it('PDF delega en el exportador', async () => {
    const archivo = await new ExportarReporteUseCase(pdfFalso).execute(tabla, 'pdf');
    expect(archivo.mime).toBe('application/pdf');
  });
});
