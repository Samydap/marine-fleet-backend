import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import { EstadoCriminal } from '../../criminales/domain/estado-criminal.enum';
import { MotivoGeneracion } from '../domain/cartel.entity';
import {
  CartelesEnMemoria,
  CriminalesEnMemoria,
  emisorFalso,
  RendererFalso,
  resumen,
  StorageEnMemoria,
} from '../test-utils/dobles-carteles';
import { GenerarCartelUseCase } from './generar-cartel.use-case';

function crear(): {
  useCase: GenerarCartelUseCase;
  carteles: CartelesEnMemoria;
  criminales: CriminalesEnMemoria;
  storage: StorageEnMemoria;
  eventos: ReturnType<typeof emisorFalso>;
} {
  const carteles = new CartelesEnMemoria();
  const criminales = new CriminalesEnMemoria();
  const storage = new StorageEnMemoria();
  const eventos = emisorFalso();
  const useCase = new GenerarCartelUseCase(
    carteles,
    criminales.puerto,
    new RendererFalso(),
    storage,
    eventos,
  );
  return { useCase, carteles, criminales, storage, eventos };
}

const REGISTRO = { criminalId: 'c-luffy', motivo: MotivoGeneracion.REGISTRO, usuarioId: 'u-1' };

describe('GenerarCartelUseCase', () => {
  it('genera la version 1, guarda el PDF y emite CARTEL_GENERADO', async () => {
    const { useCase, storage, eventos } = crear();

    const { cartel, generado } = await useCase.execute(REGISTRO);

    expect(generado).toBe(true);
    expect(cartel.numeroVersion).toBe(1);
    expect(cartel.vigente).toBe(true);
    expect(cartel.archivo.url).toBe('/api/v1/archivos/carteles/c-luffy/v1.pdf');
    expect(storage.archivos.has('carteles/c-luffy/v1.pdf')).toBe(true);
    expect(cartel.datosInstantanea).toMatchObject({
      nombre: 'Monkey D. Luffy',
      recompensa: 3_000_000_000,
    });
    expect(eventos.emitidos[0][0]).toBe(EVENTOS.CARTEL_GENERADO);
  });

  it('no crea version nueva si la instantanea no cambio (idempotente)', async () => {
    const { useCase, carteles } = crear();
    await useCase.execute(REGISTRO);

    const segundo = await useCase.execute({
      ...REGISTRO,
      motivo: MotivoGeneracion.CAMBIO_RECOMPENSA,
    });

    expect(segundo.generado).toBe(false);
    expect(carteles.carteles).toHaveLength(1);
  });

  it('crea la version 2 y deja la 1 no vigente cuando cambia la recompensa', async () => {
    const { useCase, carteles, criminales } = crear();
    await useCase.execute(REGISTRO);
    criminales.datos = [resumen({ recompensaVigenteMonto: 3_500_000_000 })];

    const { cartel } = await useCase.execute({
      ...REGISTRO,
      motivo: MotivoGeneracion.CAMBIO_RECOMPENSA,
    });

    expect(cartel.numeroVersion).toBe(2);
    expect(carteles.carteles.filter((c) => c.vigente)).toHaveLength(1);
    expect(carteles.carteles.find((c) => c.numeroVersion === 1)?.vigente).toBe(false);
  });

  it('MANUAL con forzar crea version aunque no haya cambios', async () => {
    const { useCase } = crear();
    await useCase.execute(REGISTRO);

    const { cartel, generado } = await useCase.execute({
      ...REGISTRO,
      motivo: MotivoGeneracion.MANUAL,
      forzar: true,
    });

    expect(generado).toBe(true);
    expect(cartel.numeroVersion).toBe(2);
  });

  it('dos eventos simultaneos del mismo criminal no chocan con el numero de version', async () => {
    const { useCase, carteles, criminales } = crear();
    await useCase.execute(REGISTRO);
    criminales.datos = [resumen({ estado: EstadoCriminal.CAPTURADO })];

    const resultados = await Promise.all([
      useCase.execute({ ...REGISTRO, motivo: MotivoGeneracion.CAMBIO_ESTADO }),
      useCase.execute({ ...REGISTRO, motivo: MotivoGeneracion.CAMBIO_RECOMPENSA }),
    ]);

    expect(resultados.filter((r) => r.generado)).toHaveLength(1);
    expect(carteles.carteles).toHaveLength(2);
  });

  it('falla con NotFoundError si el criminal no existe', async () => {
    const { useCase } = crear();
    await expect(useCase.execute({ ...REGISTRO, criminalId: 'c-nadie' })).rejects.toThrow(
      NotFoundError,
    );
  });
});
