import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { Permiso, tienePermiso } from '../../../shared/domain/rbac/permiso.enum';
import { Controller, Get, Inject, Query, Sse, type MessageEvent } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { interval, map, merge, of, takeUntil, timer, type Observable } from 'rxjs';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { CanalSincronizacion } from '../application/canal-sincronizacion.service';
import type { CambioSincronizado } from '../domain/cambio-sincronizado';
import { VERIFICADOR_SESION, type VerificadorSesionPort } from '../domain/sincronizacion.ports';
import { CambiosQueryDto, StreamQueryDto } from './dto/sincronizacion.dto';

export const INTERVALO_LATIDO_MS = 15_000;
/** Vida del access token: el canal no sobrevive a la sesion que lo abrio. */
export const DURACION_MAXIMA_MS = 15 * 60_000;

const aMensaje = (cambio: CambioSincronizado): MessageEvent => ({
  id: String(cambio.id),
  type: cambio.evento,
  data: cambio,
});

/**
 * Sincronizacion entre bases navales en tiempo real.
 *
 *  - GET /sincronizacion/stream: Server-Sent Events. El navegador abre
 *    `new EventSource('/api/v1/sincronizacion/stream?token=...')` y recibe cada
 *    hecho del sistema en cuanto ocurre (operativos, avistamientos, criminales,
 *    enfrentamientos...). Cumple el RNF de <= 15 s con margen: la latencia real
 *    es de milisegundos.
 *  - GET /sincronizacion/cambios: polling de respaldo para clientes sin SSE.
 */
@ApiTags('sincronizacion')
@Controller({ path: 'sincronizacion', version: '1' })
export class SincronizacionController {
  constructor(
    private readonly canal: CanalSincronizacion,
    @Inject(VERIFICADOR_SESION) private readonly verificador: VerificadorSesionPort,
  ) {}

  /**
   * @Public() justificado: el guard global lee el header Authorization, que
   * EventSource no puede enviar. El token se verifica aqui, ANTES de abrir el
   * canal: un token invalido recibe 401 y no un stream vacio.
   */
  @Public()
  @Sse('stream')
  @ApiOperation({ summary: 'Canal SSE de cambios en tiempo real (token por query string)' })
  stream(@Query() query: StreamQueryDto): Observable<MessageEvent> {
    const usuario = this.verificador.verificar(query.token);
    // Los eventos llevan datos de criminales: solo roles con lectura de criminales.
    if (!tienePermiso(usuario.permisos, Permiso.CRIMINALES_LEER)) {
      throw new ForbiddenError('recibir el canal de sincronizacion');
    }

    const pendientes =
      query.ultimoId !== undefined
        ? this.canal.cambiosDesde(usuario, { despuesDeId: query.ultimoId })
        : [];

    const latido = interval(INTERVALO_LATIDO_MS).pipe(
      map((): MessageEvent => ({
        type: 'latido',
        data: { evento: 'latido', fecha: new Date().toISOString() },
      })),
    );

    // El token solo se valida al abrir: el canal se cierra a los 15 min (vida
    // del access token). EventSource reconecta solo y, si el token vencio o la
    // cuenta fue bloqueada, la reconexion recibe 401.
    return merge(
      of(...pendientes.map(aMensaje)),
      this.canal.flujoPara(usuario).pipe(map(aMensaje)),
      latido,
    ).pipe(takeUntil(timer(DURACION_MAXIMA_MS)));
  }

  @Get('cambios')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambios recientes (polling de respaldo, ultimos 500)' })
  cambios(
    @Query() query: CambiosQueryDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): { ultimoId: number; cambios: CambioSincronizado[] } {
    return {
      ultimoId: this.canal.ultimoId(),
      cambios: this.canal.cambiosDesde(usuario, {
        desde: query.desde ? new Date(query.desde) : undefined,
        despuesDeId: query.despuesDeId,
      }),
    };
  }
}
