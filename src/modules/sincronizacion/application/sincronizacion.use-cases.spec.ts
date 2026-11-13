import { firstValueFrom, take, toArray } from 'rxjs';
import { PageResult } from '../../../shared/application/pagination/page-result';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { EVENTOS } from '../../../shared/domain/events/domain-event';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { Notificacion } from '../domain/notificacion.entity';
import type {
  FiltroNotificaciones,
  NotificacionRepositoryPort,
} from '../domain/sincronizacion.ports';
import { CAPACIDAD_BUFFER, CanalSincronizacion } from './canal-sincronizacion.service';
import {
  ListarNotificacionesUseCase,
  MarcarNotificacionLeidaUseCase,
} from './notificaciones.use-cases';
import { ObtenerSaludUseCase } from './obtener-salud.use-case';
import { RegistrarNotificacionesUseCase } from './registrar-notificaciones.use-case';

class NotificacionesEnMemoria implements NotificacionRepositoryPort {
  readonly filas: Notificacion[] = [];
  ultimoFiltro: FiltroNotificaciones | null = null;

  guardarVarias(notificaciones: Notificacion[]): Promise<void> {
    this.filas.push(...notificaciones);
    return Promise.resolve();
  }
  buscarPorId(id: string): Promise<Notificacion | null> {
    return Promise.resolve(this.filas.find((n) => n.id === id) ?? null);
  }
  listar(filtro: FiltroNotificaciones): Promise<PageResult<Notificacion>> {
    this.ultimoFiltro = filtro;
    return Promise.resolve(new PageResult(this.filas, this.filas.length, 1, 20));
  }
  guardar(notificacion: Notificacion): Promise<Notificacion> {
    return Promise.resolve(notificacion);
  }
}

const CAPITAN = { permisos: [Permiso.OPERATIVOS_LEER], baseNavalId: 'b-loguetown' };

describe('CanalSincronizacion', () => {
  it('entrega en vivo solo lo visible para la base del usuario', async () => {
    const canal = new CanalSincronizacion();
    const recibidos = firstValueFrom(canal.flujoPara(CAPITAN).pipe(take(2), toArray()));

    canal.publicar(EVENTOS.OPERATIVO_ACTUALIZADO, { basesIds: ['b-g5'] });
    canal.publicar(EVENTOS.OPERATIVO_ACTUALIZADO, { basesIds: ['b-loguetown'] });
    canal.publicar(EVENTOS.CRIMINAL_ACTUALIZADO, { criminalId: 'c-luffy' });

    expect((await recibidos).map((c) => c.id)).toEqual([2, 3]);
  });

  it('guarda los ultimos cambios para reanudar y para el polling', () => {
    const canal = new CanalSincronizacion();
    for (let i = 0; i < CAPACIDAD_BUFFER + 5; i += 1) canal.publicar('x', {});

    const todos = canal.cambiosDesde(CAPITAN, {});
    expect(todos).toHaveLength(CAPACIDAD_BUFFER);
    expect(canal.cambiosDesde(CAPITAN, { despuesDeId: canal.ultimoId() - 3 })).toHaveLength(3);
  });
});

describe('notificaciones', () => {
  it('persiste una notificacion por base desde el evento', async () => {
    const repo = new NotificacionesEnMemoria();
    const creadas = await new RegistrarNotificacionesUseCase(repo).execute({
      evento: EVENTOS.OPERATIVO_ACTUALIZADO,
      datos: {
        operativoId: 'op-1',
        codigo: 'OP-2026-0001',
        cambio: 'ESTADO',
        estado: 'EN_CURSO',
        prioridad: 'ALTA',
        basesIds: ['b-g5', 'b-loguetown'],
        usuarioId: null,
      },
    });
    expect(creadas).toBe(2);
    expect(repo.filas[0].leida).toBe(false);
  });

  it('la bandeja de un capitan se limita a su base', async () => {
    const repo = new NotificacionesEnMemoria();
    await new ListarNotificacionesUseCase(repo).execute({
      usuario: CAPITAN,
      soloNoLeidas: true,
      page: 1,
      limit: 20,
    });
    expect(repo.ultimoFiltro).toMatchObject({ baseNavalId: 'b-loguetown', soloNoLeidas: true });
  });

  it('marca como leida, pero no las de otra base', async () => {
    const repo = new NotificacionesEnMemoria();
    repo.filas.push(
      Object.assign(new Notificacion(), { id: 'n-1', baseNavalId: 'b-loguetown', leida: false }),
      Object.assign(new Notificacion(), { id: 'n-2', baseNavalId: 'b-g5', leida: false }),
    );
    const marcar = new MarcarNotificacionLeidaUseCase(repo);

    expect((await marcar.execute({ id: 'n-1', usuario: CAPITAN })).leida).toBe(true);
    await expect(marcar.execute({ id: 'n-2', usuario: CAPITAN })).rejects.toThrow(ForbiddenError);
  });
});

describe('ObtenerSaludUseCase', () => {
  it('reporta OK con latencia o DEGRADADO si la base no responde', async () => {
    const ok = await new ObtenerSaludUseCase({
      pingBaseDeDatos: (): Promise<number> => Promise.resolve(3),
    }).execute();
    expect(ok).toMatchObject({ estado: 'OK', baseDeDatos: { disponible: true, latenciaMs: 3 } });

    const caida = await new ObtenerSaludUseCase({
      pingBaseDeDatos: (): Promise<number> => Promise.reject(new Error('sin conexion')),
    }).execute();
    expect(caida.estado).toBe('DEGRADADO');
  });
});
