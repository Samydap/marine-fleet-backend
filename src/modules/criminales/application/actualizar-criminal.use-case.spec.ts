import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConcurrencyError } from '../../../shared/domain/errors/concurrency.error';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { EstadoCriminal } from '../domain/estado-criminal.enum';
import { CriminalesEnMemoria, crearCriminal } from '../testing/dobles-en-memoria';
import { ActualizarCriminalUseCase } from './actualizar-criminal.use-case';

describe('ActualizarCriminalUseCase', () => {
  let criminales: CriminalesEnMemoria;
  let eventos: EventEmitter2;
  let useCase: ActualizarCriminalUseCase;

  beforeEach(() => {
    criminales = new CriminalesEnMemoria();
    criminales.datos.set('c-luffy', crearCriminal());
    criminales.datos.set(
      'c-zoro',
      crearCriminal({ id: 'c-zoro', nombre: 'Roronoa Zoro', nombreNormalizado: 'roronoa zoro' }),
    );
    eventos = new EventEmitter2();
    useCase = new ActualizarCriminalUseCase(criminales, eventos);
  });

  it('actualiza los datos y avisa con motivo DATOS', async () => {
    const espia = jest.spyOn(eventos, 'emitAsync');
    const criminal = await useCase.execute({
      criminalId: 'c-luffy',
      version: 1,
      cambios: { edad: 20, descripcionFisica: 'Cicatriz en X en el pecho' },
      usuarioId: 'u-analista',
    });

    expect(criminal.edad).toBe(20);
    expect(espia).toHaveBeenCalledWith('criminal.actualizado', {
      criminalId: 'c-luffy',
      usuarioId: 'u-analista',
      motivos: ['DATOS'],
    });
  });

  it('distingue el cambio de zona para que Amenaza reclasifique', async () => {
    const espia = jest.spyOn(eventos, 'emitAsync');
    await useCase.execute({
      criminalId: 'c-luffy',
      version: 1,
      cambios: { zonaInfluenciaId: 'z-sabaody' },
      usuarioId: 'u-analista',
    });
    expect(espia).toHaveBeenCalledWith(
      'criminal.actualizado',
      expect.objectContaining({ motivos: ['ZONA'] }),
    );
  });

  it('no guarda ni emite si nada cambio', async () => {
    const espia = jest.spyOn(eventos, 'emitAsync');
    await useCase.execute({
      criminalId: 'c-luffy',
      version: 1,
      cambios: { edad: 19 },
      usuarioId: 'u-analista',
    });
    expect(criminales.guardados).toBe(0);
    expect(espia).not.toHaveBeenCalled();
  });

  it('rechaza con conflicto si la version leida ya no es la actual', async () => {
    await expect(
      useCase.execute({ criminalId: 'c-luffy', version: 7, cambios: { edad: 20 }, usuarioId: 'u' }),
    ).rejects.toThrow(ConcurrencyError);
  });

  it('no permite renombrar con el nombre de otro criminal', async () => {
    await expect(
      useCase.execute({
        criminalId: 'c-luffy',
        version: 1,
        cambios: { nombre: 'roronoa ZORO' },
        usuarioId: 'u',
      }),
    ).rejects.toThrow(DomainError);
  });

  it('recalcula el nombre normalizado al renombrar', async () => {
    const criminal = await useCase.execute({
      criminalId: 'c-luffy',
      version: 1,
      cambios: { nombre: 'Monkey D. Luffy (Joy Boy)' },
      usuarioId: 'u',
    });
    expect(criminal.nombreNormalizado).toBe('monkey d luffy joy boy');
  });

  it('no permite editar a un criminal MUERTO', async () => {
    criminales.datos.set('c-luffy', crearCriminal({ estado: EstadoCriminal.MUERTO }));
    await expect(
      useCase.execute({ criminalId: 'c-luffy', version: 1, cambios: { edad: 20 }, usuarioId: 'u' }),
    ).rejects.toThrow(DomainError);
  });
});
