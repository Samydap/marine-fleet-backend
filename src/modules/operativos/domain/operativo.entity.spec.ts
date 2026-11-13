import { DomainError } from '../../../shared/domain/errors/domain.error';
import { operativoDePrueba } from '../application/testing/dobles-operativos';
import { EstadoOperativo, PrioridadOperativo, ResultadoOperativo } from './estado-operativo.enum';

describe('Operativo (reglas de ciclo de vida)', () => {
  it('pasa de PLANIFICADO a EN_CURSO y registra el inicio real', () => {
    const operativo = operativoDePrueba();
    operativo.cambiarEstado(EstadoOperativo.EN_CURSO);
    expect(operativo.estado).toBe(EstadoOperativo.EN_CURSO);
    expect(operativo.fechaInicioReal).toBeInstanceOf(Date);
  });

  it('no permite completar sin pasar por el cierre', () => {
    const operativo = operativoDePrueba({ estado: EstadoOperativo.EN_CURSO });
    expect(() => operativo.cambiarEstado(EstadoOperativo.CERRADO)).toThrow(DomainError);
  });

  it('cierra un operativo en curso con resultado y observaciones', () => {
    const operativo = operativoDePrueba({ estado: EstadoOperativo.EN_CURSO });
    operativo.cerrar(ResultadoOperativo.PARCIAL, 'Escapo en un bote');
    expect(operativo.estado).toBe(EstadoOperativo.CERRADO);
    expect(operativo.resultadoFinal).toBe(ResultadoOperativo.PARCIAL);
    expect(operativo.fechaCierre).toBeInstanceOf(Date);
  });

  it('no cierra un operativo que no ha iniciado', () => {
    expect(() => operativoDePrueba().cerrar(ResultadoOperativo.EXITOSO, null)).toThrow(DomainError);
  });

  it('un operativo finalizado no cambia de prioridad', () => {
    const operativo = operativoDePrueba({ estado: EstadoOperativo.ABORTADO });
    expect(() => operativo.cambiarPrioridad(PrioridadOperativo.ALTA)).toThrow(DomainError);
  });

  it('las bases involucradas incluyen la lider sin duplicarla', () => {
    expect(operativoDePrueba().basesInvolucradas()).toEqual(['b-g5']);
  });
});
