import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { MotivoGeneracion } from '../domain/cartel.entity';
import {
  CartelesEnMemoria,
  CriminalesEnMemoria,
  emisorFalso,
  RendererFalso,
  resumen,
  StorageEnMemoria,
} from '../test-utils/dobles-carteles';
import { DescargarCartelUseCase } from './descargar-cartel.use-case';
import { GenerarCartelUseCase } from './generar-cartel.use-case';
import { ObtenerCartelVigenteUseCase } from './obtener-cartel-vigente.use-case';
import { RegenerarPorCambioUseCase } from './regenerar-por-cambio.use-case';
import { RegenerarTodosUseCase } from './regenerar-todos.use-case';

function contexto(): {
  carteles: CartelesEnMemoria;
  criminales: CriminalesEnMemoria;
  storage: StorageEnMemoria;
  renderer: RendererFalso;
  generar: GenerarCartelUseCase;
} {
  const carteles = new CartelesEnMemoria();
  const criminales = new CriminalesEnMemoria([
    resumen(),
    resumen({ id: 'c-zoro', nombre: 'Roronoa Zoro' }),
  ]);
  const storage = new StorageEnMemoria();
  const renderer = new RendererFalso();
  const generar = new GenerarCartelUseCase(
    carteles,
    criminales.puerto,
    renderer,
    storage,
    emisorFalso(),
  );
  return { carteles, criminales, storage, renderer, generar };
}

describe('RegenerarPorCambioUseCase', () => {
  it('no genera nada para un motivo que no obliga version nueva', async () => {
    const { generar, carteles } = contexto();
    const resultado = await new RegenerarPorCambioUseCase(generar).execute({
      criminalId: 'c-luffy',
      motivo: MotivoGeneracion.MANUAL,
      usuarioId: null,
    });
    expect(resultado).toBeNull();
    expect(carteles.carteles).toHaveLength(0);
  });

  it('genera el cartel para un cambio de estado', async () => {
    const { generar } = contexto();
    const resultado = await new RegenerarPorCambioUseCase(generar).execute({
      criminalId: 'c-luffy',
      motivo: MotivoGeneracion.CAMBIO_ESTADO,
      usuarioId: null,
    });
    expect(resultado?.generado).toBe(true);
  });
});

describe('ObtenerCartelVigenteUseCase', () => {
  it('falla si el criminal todavia no tiene cartel', async () => {
    const { carteles } = contexto();
    await expect(new ObtenerCartelVigenteUseCase(carteles).execute('c-luffy')).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('DescargarCartelUseCase', () => {
  it('entrega el PDF guardado sin volver a dibujarlo', async () => {
    const { generar, carteles, storage, renderer } = contexto();
    const { cartel } = await generar.execute({
      criminalId: 'c-luffy',
      motivo: MotivoGeneracion.REGISTRO,
      usuarioId: null,
    });
    renderer.llamadas = [];

    const archivo = await new DescargarCartelUseCase(carteles, renderer, storage).execute({
      cartelId: cartel.id,
      formato: 'pdf',
    });

    expect(archivo.mime).toBe('application/pdf');
    expect(archivo.nombreArchivo).toBe('cartel-c-luffy-v1.pdf');
    expect(renderer.llamadas).toHaveLength(0);
  });

  it('dibuja la imagen SVG desde la instantanea de esa version', async () => {
    const { generar, carteles, storage, renderer } = contexto();
    const { cartel } = await generar.execute({
      criminalId: 'c-luffy',
      motivo: MotivoGeneracion.REGISTRO,
      usuarioId: null,
    });

    const archivo = await new DescargarCartelUseCase(carteles, renderer, storage).execute({
      cartelId: cartel.id,
      formato: 'svg',
    });

    expect(archivo.mime).toBe('image/svg+xml');
    expect(renderer.llamadas.at(-1)?.datos.nombre).toBe('Monkey D. Luffy');
  });
});

describe('RegenerarTodosUseCase', () => {
  it('genera solo los carteles que faltan', async () => {
    const { generar, carteles, criminales } = contexto();
    await generar.execute({
      criminalId: 'c-luffy',
      motivo: MotivoGeneracion.REGISTRO,
      usuarioId: null,
    });

    const resultado = await new RegenerarTodosUseCase(criminales.puerto, carteles, generar).execute(
      null,
    );

    expect(resultado).toEqual({ generados: 1, omitidos: 1, fallidos: [] });
    expect(carteles.carteles).toHaveLength(2);
  });
});
