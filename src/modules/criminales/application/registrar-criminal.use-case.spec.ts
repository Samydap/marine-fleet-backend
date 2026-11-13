import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { EstadoCriminal, NivelAmenaza, RolMembresia } from '../domain/estado-criminal.enum';
import { Organizacion } from '../domain/organizacion.entity';
import {
  CriminalesEnMemoria,
  crearCriminal,
  MembresiasEnMemoria,
  OrganizacionesEnMemoria,
} from '../testing/dobles-en-memoria';
import { RegistrarCriminalUseCase } from './registrar-criminal.use-case';

/**
 * PRUEBA DE REFERENCIA. Fijate en que no hay base de datos ni NestJS: el caso
 * de uso depende de puertos, asi que se prueba con dobles en memoria.
 * Eso es lo que permite que un dev avance sin esperar el adaptador de otro.
 */
describe('RegistrarCriminalUseCase', () => {
  let criminales: CriminalesEnMemoria;
  let membresias: MembresiasEnMemoria;
  let organizaciones: OrganizacionesEnMemoria;
  let eventos: EventEmitter2;
  let useCase: RegistrarCriminalUseCase;

  beforeEach(() => {
    criminales = new CriminalesEnMemoria();
    membresias = new MembresiasEnMemoria();
    organizaciones = new OrganizacionesEnMemoria();
    organizaciones.datos.set(
      'org-sombrero-paja',
      Object.assign(new Organizacion(), {
        id: 'org-sombrero-paja',
        nombre: 'Sombrero de Paja',
        activa: true,
      }),
    );
    eventos = new EventEmitter2();
    useCase = new RegistrarCriminalUseCase(criminales, organizaciones, membresias, eventos);
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
    expect(criminales.guardados).toBe(1);
  });

  it('deja el nivel de amenaza en PENDIENTE para que lo calcule el modulo amenaza', async () => {
    const criminal = await useCase.execute(input);
    expect(criminal.nivelAmenaza).toBe(NivelAmenaza.PENDIENTE);
  });

  it('registra quien lo creo para que el trigger de historial lo atribuya', async () => {
    const criminal = await useCase.execute(input);
    expect(criminal.creadoPor).toBe('u-smoker');
    expect(criminal.actualizadoPor).toBe('u-smoker');
  });

  it('emite criminal.registrado y espera a los oyentes', async () => {
    const espia = jest.spyOn(eventos, 'emitAsync');
    const criminal = await useCase.execute(input);
    expect(espia).toHaveBeenCalledWith('criminal.registrado', {
      criminalId: criminal.id,
      usuarioId: 'u-smoker',
    });
  });

  it('crea la afiliacion cuando se indica la organizacion', async () => {
    const criminal = await useCase.execute({
      ...input,
      organizacionId: 'org-sombrero-paja',
      rolEnOrganizacion: RolMembresia.LIDER,
    });

    expect(membresias.datos).toHaveLength(1);
    expect(membresias.datos[0]).toMatchObject({
      criminalId: criminal.id,
      organizacionId: 'org-sombrero-paja',
      rol: RolMembresia.LIDER,
      vigente: true,
    });
  });

  it('no guarda nada si la organizacion no existe', async () => {
    await expect(useCase.execute({ ...input, organizacionId: 'org-nada' })).rejects.toThrow(
      NotFoundError,
    );
    expect(criminales.guardados).toBe(0);
  });

  it('rechaza un duplicado aunque el nombre venga escrito distinto', async () => {
    criminales.datos.set('c-luffy', crearCriminal());

    await expect(useCase.execute({ ...input, nombre: 'monkey d  luffy' })).rejects.toThrow(
      DomainError,
    );
  });

  it('un oyente que falla no deshace el registro', async () => {
    eventos.on('criminal.registrado', () => Promise.reject(new Error('cartel caido')));
    await expect(useCase.execute(input)).resolves.toBeDefined();
  });
});
