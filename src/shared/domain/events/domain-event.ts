/**
 * Evento de dominio. Es el mecanismo que desacopla modulos sin que un dev
 * dependa del codigo de otro: Recompensas publica, Amenaza y Carteles escuchan.
 */
export abstract class DomainEvent {
  readonly ocurridoEn: Date = new Date();
  abstract readonly nombre: string;

  protected constructor(readonly agregadoId: string) {}
}

/**
 * Nombres de evento centralizados para que emisor y oyente no se desalineen.
 * El payload de cada uno esta tipado en `eventos.contracts.ts`.
 */
export const EVENTOS = {
  CRIMINAL_REGISTRADO: 'criminal.registrado',
  CRIMINAL_ACTUALIZADO: 'criminal.actualizado',
  CRIMINAL_ESTADO_CAMBIADO: 'criminal.estado-cambiado',
  RECOMPENSA_SOLICITADA: 'recompensa.solicitada',
  RECOMPENSA_VIGENTE: 'recompensa.vigente',
  AMENAZA_RECLASIFICADA: 'amenaza.reclasificada',
  CRITERIOS_AMENAZA_ACTUALIZADOS: 'amenaza.criterios-actualizados',
  CARTEL_GENERADO: 'cartel.generado',
  AVISTAMIENTO_REGISTRADO: 'avistamiento.registrado',
  REPORTE_RECIBIDO: 'reporte.recibido',
  REPORTE_APROBADO: 'reporte.aprobado',
  OPERATIVO_ACTUALIZADO: 'operativo.actualizado',
  INCIDENTE_REGISTRADO: 'incidente.registrado',
  INCIDENTE_CERRADO: 'incidente.cerrado',
} as const;

export type NombreEvento = (typeof EVENTOS)[keyof typeof EVENTOS];
