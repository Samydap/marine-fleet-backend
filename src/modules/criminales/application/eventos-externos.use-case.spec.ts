import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoCriminal } from '../domain/estado-criminal.enum';
import { CriminalesEnMemoria, crearCriminal } from '../testing/dobles-en-memoria';
import { AplicarDesenlaceIncidenteUseCase } from './aplicar-desenlace-incidente.use-case';
import { AplicarRecompensaVigenteUseCase } from './aplicar-recompensa-vigente.use-case';

describe('Casos de uso disparados por eventos de otros modulos', () => {
  let criminales: CriminalesEnMemoria;
  let eventos: EventEmitter2;

  beforeEach(() => {
    criminales = new CriminalesEnMemoria();
    criminales.datos.set('c-luffy', crearCriminal());
    criminales.datos.set('c-zoro', crearCriminal({ id: 'c-zoro' }));
    criminales.datos.set('c-ace', crearCriminal({ id: 'c-ace', estado: EstadoCriminal.MUERTO }));
    eventos = new EventEmitter2();
  });

  it('RECOMPENSA_VIGENTE actualiza el monto y emite motivo RECOMPENSA', async () => {
    const espia = jest.spyOn(eventos, 'emitAsync');
    await new AplicarRecompensaVigenteUseCase(criminales, eventos).execute({
      recompensaId: 'r1',
      criminalId: 'c-luffy',
      monto: 3_500_000_000,
      moneda: 'BERRIES',
      usuarioId: 'u-almirante',
    });

    const luffy = criminales.datos.get('c-luffy');
    expect(luffy?.recompensaVigenteMonto).toBe(3_500_000_000);
    expect(luffy?.actualizadoPor).toBe('u-almirante');
    expect(espia).toHaveBeenCalledWith(
      'criminal.actualizado',
      expect.objectContaining({ motivos: ['RECOMPENSA'] }),
    );
  });

  it('INCIDENTE_CERRADO captura a los criminales con desenlace CAPTURADO', async () => {
    const cambiados = await new AplicarDesenlaceIncidenteUseCase(criminales, eventos).execute({
      incidenteId: 'i1',
      operativoId: null,
      resultado: 'EXITO',
      desenlaces: [
        { criminalId: 'c-luffy', desenlace: 'CAPTURADO' },
        { criminalId: 'c-zoro', desenlace: 'ESCAPO' },
        { criminalId: 'c-ace', desenlace: 'CAPTURADO' },
      ],
      usuarioId: 'u-coordinador',
    });

    expect(cambiados).toBe(1);
    expect(criminales.datos.get('c-luffy')?.estado).toBe(EstadoCriminal.CAPTURADO);
    expect(criminales.datos.get('c-zoro')?.estado).toBe(EstadoCriminal.ACTIVO);
    // Un MUERTO no "revive" como capturado: la transicion se ignora sin fallar.
    expect(criminales.datos.get('c-ace')?.estado).toBe(EstadoCriminal.MUERTO);
  });
});
