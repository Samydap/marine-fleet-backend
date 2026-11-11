/**
 * Evento de dominio. Es el mecanismo que desacopla modulos sin que un dev
 * dependa del codigo de otro: Recompensas publica, Amenaza y Carteles escuchan.
 */
export abstract class DomainEvent {
  readonly ocurridoEn: Date = new Date();
  abstract readonly nombre: string;

  protected constructor(readonly agregadoId: string) {}
}

/** Nombres de evento centralizados para que emisor y oyente no se desalineen. */
export const EVENTOS = {
  CRIMINAL_REGISTRADO: 'criminal.registrado',
  CRIMINAL_ACTUALIZADO: 'criminal.actualizado',
  CRIMINAL_ESTADO_CAMBIADO: 'criminal.estado-cambiado',
  RECOMPENSA_VIGENTE: 'recompensa.vigente',
  AMENAZA_RECLASIFICADA: 'amenaza.reclasificada',
  REPORTE_APROBADO: 'reporte.aprobado',
  INCIDENTE_CERRADO: 'incidente.cerrado',
} as const;
