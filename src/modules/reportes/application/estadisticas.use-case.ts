import { Inject, Injectable } from '@nestjs/common';
import type { QueryUseCase } from '../../../shared/application/use-case.interface';
import { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import { rangoDePeriodo, ultimosPeriodos } from '../domain/periodo';
import { REPORTES_LECTURA, type ReportesLecturaPort } from '../domain/reportes-lectura.port';
import type { Estadisticas, PuntoGrafico } from '../domain/reportes.types';

const MESES = 6;
const NIVELES = [NivelAmenaza.ALTO, NivelAmenaza.MEDIO, NivelAmenaza.BAJO, NivelAmenaza.PENDIENTE];
const ESTADOS = ['ACTIVO', 'CAPTURADO', 'MUERTO'];

/** Garantiza que todas las etiquetas aparezcan, aunque valgan cero: el grafico no "salta". */
function completar(puntos: PuntoGrafico[], etiquetas: readonly string[]): PuntoGrafico[] {
  return etiquetas.map((etiqueta) => ({
    etiqueta,
    valor: puntos.find((p) => p.etiqueta === etiqueta)?.valor ?? 0,
  }));
}

/**
 * RNF "la interfaz de estadisticas debe presentar graficos de distribucion
 * sencillos y claros". Este caso de uso entrega los datos YA en la forma que un
 * grafico consume ({ etiqueta, valor }), con todas las categorias presentes.
 */
@Injectable()
export class EstadisticasUseCase implements QueryUseCase<Estadisticas> {
  constructor(@Inject(REPORTES_LECTURA) private readonly lectura: ReportesLecturaPort) {}

  async execute(): Promise<Estadisticas> {
    const periodos = ultimosPeriodos(MESES);
    const datos = await this.lectura.estadisticas(rangoDePeriodo(periodos[0]).inicio);

    return {
      ...datos,
      porNivelAmenaza: completar(datos.porNivelAmenaza, NIVELES),
      porEstado: completar(datos.porEstado, ESTADOS),
      avistamientosPorMes: completar(datos.avistamientosPorMes, periodos),
    };
  }
}
