import { EventEmitter2 } from '@nestjs/event-emitter';
import { NivelAmenaza } from '../../../shared/domain/value-objects/nivel-amenaza.enum';
import type {
  CriminalNivelWriterPort,
  CriminalReaderPort,
  CriminalResumen,
} from '../../criminales/domain/criminal.repository.port';
import { EstadoCriminal } from '../../criminales/domain/estado-criminal.enum';
import type { AnalisisRiesgo } from '../domain/analisis-riesgo.entity';
import type { AnalisisRiesgoRepositoryPort } from '../domain/analisis-riesgo.repository.port';
import type { ContextoZonaPort } from '../domain/contexto-zona.port';
import { CriterioAmenaza } from '../domain/criterio-amenaza.entity';
import type { CriterioAmenazaRepositoryPort } from '../domain/criterio-amenaza.repository.port';
import type { CriterioVigente } from '../domain/motor-clasificacion';
import { ActualizarCriteriosUseCase } from './actualizar-criterios.use-case';
import { ClasificarCriminalUseCase } from './clasificar-criminal.use-case';
import { ReclasificarMasivoUseCase } from './reclasificar-masivo.use-case';

const aCriterio = (c: CriterioVigente): CriterioAmenaza =>
  Object.assign(new CriterioAmenaza(), { ...c, id: c.nivel, vigente: true });

class CriteriosEnMemoria implements CriterioAmenazaRepositoryPort {
  vigentes: CriterioAmenaza[] = [
    aCriterio({ nivel: NivelAmenaza.BAJO, montoMinimo: 1, montoMaximo: 99_999_999 }),
    aCriterio({ nivel: NivelAmenaza.MEDIO, montoMinimo: 100_000_000, montoMaximo: 999_999_999 }),
    aCriterio({ nivel: NivelAmenaza.ALTO, montoMinimo: 1_000_000_000, montoMaximo: null }),
  ];
  listarVigentes(): Promise<CriterioAmenaza[]> {
    return Promise.resolve(this.vigentes);
  }
  listarHistorial(): Promise<CriterioAmenaza[]> {
    return Promise.resolve(this.vigentes);
  }
  reemplazarVigentes(nuevos: readonly CriterioVigente[]): Promise<CriterioAmenaza[]> {
    this.vigentes = nuevos.map(aCriterio);
    return Promise.resolve(this.vigentes);
  }
}

/** Un solo doble que hace de lector y de escritor del nivel, como el adaptador real. */
class CriminalesFalsos implements CriminalReaderPort, CriminalNivelWriterPort {
  readonly datos = new Map<
    string,
    { monto: number | null; zona: string | null; nivel: NivelAmenaza }
  >([
    ['c-nami', { monto: 66_000_000, zona: 'z-cocoyasi', nivel: NivelAmenaza.BAJO }],
    ['c-usopp', { monto: 500_000_000, zona: 'z-water7', nivel: NivelAmenaza.MEDIO }],
    ['c-dragon', { monto: null, zona: null, nivel: NivelAmenaza.PENDIENTE }],
  ]);

  obtenerResumen(id: string): Promise<CriminalResumen | null> {
    const c = this.datos.get(id);
    if (!c) return Promise.resolve(null);
    return Promise.resolve({
      id,
      nombre: id,
      alias: [],
      estado: EstadoCriminal.ACTIVO,
      nivelAmenaza: c.nivel,
      recompensaVigenteMonto: c.monto,
      zonaInfluenciaId: c.zona,
      fotoUrl: null,
      organizacion: null,
    });
  }
  existe(id: string): Promise<boolean> {
    return Promise.resolve(this.datos.has(id));
  }
  obtenerResumenes(): Promise<CriminalResumen[]> {
    return Promise.resolve([]);
  }
  listarTodosLosIds(): Promise<string[]> {
    return Promise.resolve([...this.datos.keys()]);
  }
  contarPorNivelAmenaza(): Promise<Array<{ nivel: NivelAmenaza; total: number }>> {
    return Promise.resolve([]);
  }
  actualizarNivelAmenaza(id: string, nivel: NivelAmenaza): Promise<NivelAmenaza | null> {
    const c = this.datos.get(id);
    if (!c) return Promise.resolve(null);
    const anterior = c.nivel;
    c.nivel = nivel;
    return Promise.resolve(anterior);
  }
}

describe('Clasificacion de amenaza (RF-5)', () => {
  let criminales: CriminalesFalsos;
  let criterios: CriteriosEnMemoria;
  let analisis: AnalisisRiesgo[];
  let eventos: EventEmitter2;
  let clasificar: ClasificarCriminalUseCase;

  beforeEach(() => {
    criminales = new CriminalesFalsos();
    criterios = new CriteriosEnMemoria();
    analisis = [];
    eventos = new EventEmitter2();
    const repoAnalisis: AnalisisRiesgoRepositoryPort = {
      guardar: (a) => {
        analisis.push(a);
        return Promise.resolve(a);
      },
      listarPorCriminal: (id) => Promise.resolve(analisis.filter((a) => a.criminalId === id)),
    };
    const zonas: ContextoZonaPort = {
      obtener: (zona) =>
        Promise.resolve({ esGrandLine: zona === 'z-water7', cercanaACuartelGeneral: false }),
    };
    clasificar = new ClasificarCriminalUseCase(
      criminales,
      criminales,
      criterios,
      repoAnalisis,
      zonas,
      eventos,
    );
  });

  it('clasifica por rango de recompensa y deja el analisis registrado', async () => {
    const r = await clasificar.execute({ criminalId: 'c-nami', usuarioId: null });

    expect(r.nivel).toBe(NivelAmenaza.BAJO);
    expect(r.cambio).toBe(false);
    expect(analisis).toHaveLength(1);
    expect(analisis[0].justificacion).toContain('BAJO');
  });

  it('escala por operar en Grand Line y emite amenaza.reclasificada', async () => {
    const espia = jest.spyOn(eventos, 'emitAsync');
    const r = await clasificar.execute({ criminalId: 'c-usopp', usuarioId: 'u-analista' });

    expect(r.nivelBase).toBe(NivelAmenaza.MEDIO);
    expect(r.nivel).toBe(NivelAmenaza.ALTO);
    expect(criminales.datos.get('c-usopp')?.nivel).toBe(NivelAmenaza.ALTO);
    expect(espia).toHaveBeenCalledWith('amenaza.reclasificada', {
      criminalId: 'c-usopp',
      nivelAnterior: NivelAmenaza.MEDIO,
      nivelNuevo: NivelAmenaza.ALTO,
    });
  });

  it('sin recompensa queda PENDIENTE', async () => {
    const r = await clasificar.execute({ criminalId: 'c-dragon', usuarioId: null });
    expect(r.nivel).toBe(NivelAmenaza.PENDIENTE);
  });

  it('al cambiar los criterios reclasifica a todos', async () => {
    const actualizar = new ActualizarCriteriosUseCase(
      criterios,
      new ReclasificarMasivoUseCase(criminales, clasificar),
      eventos,
    );

    const { reclasificacion } = await actualizar.execute({
      criterios: [
        { nivel: NivelAmenaza.BAJO, montoMinimo: 1, montoMaximo: 9_999_999 },
        { nivel: NivelAmenaza.MEDIO, montoMinimo: 10_000_000, montoMaximo: 49_999_999 },
        { nivel: NivelAmenaza.ALTO, montoMinimo: 50_000_000, montoMaximo: null },
      ],
      motivo: 'Endurecer criterios',
      usuarioId: 'u-analista',
    });

    expect(reclasificacion.total).toBe(3);
    expect(criminales.datos.get('c-nami')?.nivel).toBe(NivelAmenaza.ALTO);
    expect(reclasificacion.errores).toHaveLength(0);
  });
});
