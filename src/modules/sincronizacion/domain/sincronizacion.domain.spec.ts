import { EVENTOS } from '../../../shared/domain/events/domain-event';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { esVisiblePara, type CambioSincronizado } from './cambio-sincronizado';
import { construirNotificaciones } from './politica-notificacion';

const operativo = {
  operativoId: 'op-1',
  codigo: 'OP-2026-0001',
  cambio: 'PRIORIDAD',
  estado: 'EN_CURSO',
  prioridad: 'CRITICA',
  basesIds: ['b-g5', 'b-loguetown'],
  usuarioId: 'u-coordinador',
};

describe('politica de notificacion', () => {
  it('crea una notificacion por cada base asignada al operativo', () => {
    const notificaciones = construirNotificaciones(EVENTOS.OPERATIVO_ACTUALIZADO, operativo);
    expect(notificaciones.map((n) => n.baseNavalId)).toEqual(['b-g5', 'b-loguetown']);
    expect(notificaciones[0].mensaje).toContain('CRITICA');
    expect(notificaciones[0].tipo).toBe('OPERATIVO_PRIORIDAD');
  });

  it('las recompensas por validar y los reportes ciudadanos son globales', () => {
    const [recompensa] = construirNotificaciones(EVENTOS.RECOMPENSA_SOLICITADA, {
      recompensaId: 'r-1',
      criminalId: 'c-sabo',
      monto: 1_200_000_000,
      requiereValidacion: true,
      usuarioId: null,
    });
    expect(recompensa.baseNavalId).toBeNull();

    const sinFirma = construirNotificaciones(EVENTOS.RECOMPENSA_SOLICITADA, {
      recompensaId: 'r-2',
      criminalId: 'c-nami',
      monto: 10,
      requiereValidacion: false,
      usuarioId: null,
    });
    expect(sinFirma).toHaveLength(0);

    const [reporte] = construirNotificaciones(EVENTOS.REPORTE_RECIBIDO, {
      reporteId: 'rep-1',
      criminalId: 'c-zoro',
    });
    expect(reporte.referenciaId).toBe('rep-1');
  });

  it('un evento no notificable no produce notificaciones', () => {
    expect(construirNotificaciones(EVENTOS.CRIMINAL_ACTUALIZADO, {})).toEqual([]);
  });
});

describe('visibilidad del canal', () => {
  const cambio = (datos: unknown): CambioSincronizado => ({
    id: 1,
    evento: 'x',
    datos,
    fecha: new Date().toISOString(),
  });
  const capitan = { permisos: [Permiso.OPERATIVOS_LEER], baseNavalId: 'b-loguetown' };
  const almirante = { permisos: [Permiso.TODO], baseNavalId: 'b-otra' };

  it('un hecho dirigido a bases solo llega a esas bases y a los roles globales', () => {
    expect(esVisiblePara(cambio({ basesIds: ['b-loguetown'] }), capitan)).toBe(true);
    expect(esVisiblePara(cambio({ basesIds: ['b-g5'] }), capitan)).toBe(false);
    expect(esVisiblePara(cambio({ basesIds: ['b-g5'] }), almirante)).toBe(true);
    expect(esVisiblePara(cambio({ baseNavalId: 'b-g5' }), capitan)).toBe(false);
  });

  it('la informacion centralizada (sin base) llega a todos', () => {
    expect(esVisiblePara(cambio({ criminalId: 'c-luffy' }), capitan)).toBe(true);
  });
});
