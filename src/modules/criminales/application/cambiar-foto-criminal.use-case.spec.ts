import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import type { ArchivoGuardado, StoragePort } from '../../../shared/domain/storage/storage.port';
import { CriminalesEnMemoria, crearCriminal } from '../testing/dobles-en-memoria';
import { CambiarFotoCriminalUseCase } from './cambiar-foto-criminal.use-case';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

class StorageFalso implements StoragePort {
  rutas: string[] = [];
  guardar(ruta: string, contenido: Buffer, mime: string): Promise<ArchivoGuardado> {
    this.rutas.push(ruta);
    return Promise.resolve({
      ruta,
      url: `/api/v1/archivos/${ruta}`,
      mime,
      tamanoBytes: contenido.length,
    });
  }
  leer(): Promise<Buffer> {
    return Promise.resolve(Buffer.alloc(0));
  }
  existe(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

describe('CambiarFotoCriminalUseCase', () => {
  let criminales: CriminalesEnMemoria;
  let storage: StorageFalso;
  let eventos: EventEmitter2;
  let useCase: CambiarFotoCriminalUseCase;

  beforeEach(() => {
    criminales = new CriminalesEnMemoria();
    criminales.datos.set('c-luffy', crearCriminal());
    storage = new StorageFalso();
    eventos = new EventEmitter2();
    useCase = new CambiarFotoCriminalUseCase(criminales, storage, eventos);
  });

  it('guarda la foto en el almacenamiento y la referencia en el criminal', async () => {
    const criminal = await useCase.execute({
      criminalId: 'c-luffy',
      contenido: PNG,
      mime: 'image/png',
      usuarioId: 'u-analista',
    });

    expect(storage.rutas[0]).toMatch(/^fotos\/c-luffy\/.+\.png$/);
    expect(criminal.foto?.url).toContain('/api/v1/archivos/fotos/c-luffy/');
    expect(criminal.actualizadoPor).toBe('u-analista');
  });

  it('emite motivo FOTO para que Carteles regenere el cartel', async () => {
    const espia = jest.spyOn(eventos, 'emitAsync');
    await useCase.execute({
      criminalId: 'c-luffy',
      contenido: PNG,
      mime: 'image/png',
      usuarioId: 'u',
    });
    expect(espia).toHaveBeenCalledWith(
      'criminal.actualizado',
      expect.objectContaining({ motivos: ['FOTO'] }),
    );
  });

  it('rechaza un formato no permitido', async () => {
    await expect(
      useCase.execute({ criminalId: 'c-luffy', contenido: PNG, mime: 'image/gif', usuarioId: 'u' }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza un archivo cuyo contenido no corresponde al tipo declarado', async () => {
    await expect(
      useCase.execute({
        criminalId: 'c-luffy',
        contenido: Buffer.from('no soy una imagen'),
        mime: 'image/png',
        usuarioId: 'u',
      }),
    ).rejects.toThrow('El contenido del archivo no corresponde');
    expect(storage.rutas).toHaveLength(0);
  });

  it('rechaza archivos de mas de 2 MB', async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    await expect(
      useCase.execute({
        criminalId: 'c-luffy',
        contenido: grande,
        mime: 'image/png',
        usuarioId: 'u',
      }),
    ).rejects.toThrow(DomainError);
  });
});
