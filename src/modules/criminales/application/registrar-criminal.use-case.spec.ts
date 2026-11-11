import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { Criminal } from '../domain/criminal.entity';
import type { CriminalRepositoryPort } from '../domain/criminal.repository.port';
import { EstadoCriminal, NivelAmenaza } from '../domain/estado-criminal.enum';
import { RegistrarCriminalUseCase } from './registrar-criminal.use-case';

/**
 * PRUEBA DE REFERENCIA. Fijate en que no hay base de datos ni NestJS: el caso
 * de uso depende de un puerto, asi que se prueba con un doble en memoria.
 * Eso es lo que permite que un dev avance sin esperar el adaptador de otro.
 */
class RepositorioEnMemoria implements CriminalRepositoryPort {
  readonly guardados: Criminal[] = [];
  porNombre: Criminal | null = null;

  buscarPorId(): Promise<Criminal | null> {
    return Promise.resolve(null);
  }
  buscarPorNombreNormalizado(): Promise<Criminal | null> {
    return Promise.resolve(this.porNombre);
  }
  listar(): Promise<PageResult<Criminal>> {
    return Promise.resolve(new PageResult<Criminal>([], 0, 1, 20));
  }
  guardar(criminal: Criminal): Promise<Criminal> {
    this.guardados.push(criminal);
    return Promise.resolve(criminal);
  }
  existe(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

describe('RegistrarCriminalUseCase', () => {
  let repositorio: RepositorioEnMemoria;
  let eventos: EventEmitter2;
  let useCase: RegistrarCriminalUseCase;

  beforeEach(() => {
    repositorio = new RepositorioEnMemoria();
    eventos = new EventEmitter2();
    useCase = new RegistrarCriminalUseCase(repositorio, eventos);
  });

  const input = {
    nombre: 'Monkey D. Luffy',
    alias: ['Sombrero de Paja'],
    usuarioId: 'u-smoker',
    baseNavalId: 'b-16',
  };

  it('registra el criminal normalizando el nombre', async () => {
    const criminal = await useCase.execute(input);

    expect(criminal.nombreNormalizado).toBe('monkey d luffy');
    expect(criminal.estado).toBe(EstadoCriminal.ACTIVO);
    expect(repositorio.guardados).toHaveLength(1);
  });

  it('deja el nivel de amenaza en PENDIENTE para que lo calcule el modulo amenaza', async () => {
    const criminal = await useCase.execute(input);
    expect(criminal.nivelAmenaza).toBe(NivelAmenaza.PENDIENTE);
  });

  it('emite el evento criminal.registrado', async () => {
    const espia = jest.spyOn(eventos, 'emit');
    await useCase.execute(input);
    expect(espia).toHaveBeenCalledWith('criminal.registrado', expect.anything());
  });

  it('rechaza un duplicado aunque el nombre venga escrito distinto', async () => {
    const existente = new Criminal();
    existente.id = 'c-luffy';
    repositorio.porNombre = existente;

    await expect(useCase.execute({ ...input, nombre: 'monkey d  luffy' })).rejects.toThrow(
      DomainError,
    );
  });
});
