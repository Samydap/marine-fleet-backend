import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainError } from '../../../shared/domain/errors/domain.error';
import { RolMembresia } from '../domain/estado-criminal.enum';
import type { Membresia } from '../domain/membresia.entity';
import { Organizacion } from '../domain/organizacion.entity';
import {
  CriminalesEnMemoria,
  crearCriminal,
  MembresiasEnMemoria,
  OrganizacionesEnMemoria,
} from '../testing/dobles-en-memoria';
import { AfiliarAOrganizacionUseCase } from './afiliar-a-organizacion.use-case';
import { DesafiliarDeOrganizacionUseCase } from './desafiliar-de-organizacion.use-case';

describe('Afiliaciones (afiliar / desafiliar)', () => {
  let criminales: CriminalesEnMemoria;
  let organizaciones: OrganizacionesEnMemoria;
  let membresias: MembresiasEnMemoria;
  let eventos: EventEmitter2;
  let afiliar: AfiliarAOrganizacionUseCase;
  let desafiliar: DesafiliarDeOrganizacionUseCase;

  beforeEach(() => {
    criminales = new CriminalesEnMemoria();
    criminales.datos.set('c-luffy', crearCriminal());
    criminales.datos.set('c-zoro', crearCriminal({ id: 'c-zoro', nombre: 'Roronoa Zoro' }));
    organizaciones = new OrganizacionesEnMemoria();
    organizaciones.datos.set(
      'org-sp',
      Object.assign(new Organizacion(), { id: 'org-sp', nombre: 'Sombrero de Paja', activa: true }),
    );
    membresias = new MembresiasEnMemoria();
    eventos = new EventEmitter2();
    afiliar = new AfiliarAOrganizacionUseCase(criminales, organizaciones, membresias, eventos);
    desafiliar = new DesafiliarDeOrganizacionUseCase(membresias, eventos);
  });

  const afiliarA = (criminalId: string, rol: RolMembresia): Promise<Membresia> =>
    afiliar.execute({ criminalId, organizacionId: 'org-sp', rol, usuarioId: 'u' });

  it('crea la membresia vigente y avisa con motivo AFILIACION', async () => {
    const espia = jest.spyOn(eventos, 'emitAsync');
    const membresia = await afiliarA('c-luffy', RolMembresia.LIDER);

    expect(membresia.vigente).toBe(true);
    expect(espia).toHaveBeenCalledWith(
      'criminal.actualizado',
      expect.objectContaining({ motivos: ['AFILIACION'] }),
    );
  });

  it('al cambiar de rol cierra la membresia anterior y conserva la historia', async () => {
    await afiliarA('c-zoro', RolMembresia.MIEMBRO);
    await afiliarA('c-zoro', RolMembresia.OFICIAL);

    expect(membresias.datos).toHaveLength(2);
    expect(membresias.datos[0].vigente).toBe(false);
    expect(membresias.datos[0].fechaSalida).toBeInstanceOf(Date);
    expect(membresias.datos[1].rol).toBe(RolMembresia.OFICIAL);
  });

  it('rechaza la misma afiliacion repetida', async () => {
    await afiliarA('c-zoro', RolMembresia.MIEMBRO);
    await expect(afiliarA('c-zoro', RolMembresia.MIEMBRO)).rejects.toThrow(DomainError);
  });

  it('no permite dos lideres vigentes', async () => {
    await afiliarA('c-luffy', RolMembresia.LIDER);
    await expect(afiliarA('c-zoro', RolMembresia.LIDER)).rejects.toThrow('ya tiene un lider');
  });

  it('desafiliar cierra la membresia sin borrarla', async () => {
    await afiliarA('c-zoro', RolMembresia.MIEMBRO);
    await desafiliar.execute({ criminalId: 'c-zoro', organizacionId: 'org-sp', usuarioId: 'u' });

    expect(membresias.datos).toHaveLength(1);
    expect(membresias.datos[0].vigente).toBe(false);
  });
});
