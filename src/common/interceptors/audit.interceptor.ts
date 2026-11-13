import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { tap, type Observable } from 'rxjs';
import type {
  AuditoriaWriterPort,
  RegistroAuditoria,
} from '../../shared/domain/auditoria/auditoria.port';
import type { AuthenticatedUser } from '../../shared/domain/rbac/authenticated-user';
import { AUDIT_KEY, type MetadataAuditoria } from '../decorators/audit.decorator';

/** Campos que nunca se guardan en la bitacora aunque vengan en el cuerpo. */
const CAMPOS_SENSIBLES = /password|contrasena|token|secreto|codigo/i;

/** Textos largos (una foto en base64) no se copian a la bitacora. */
const MAX_TEXTO = 1000;

/**
 * Bitacora de acciones sensibles (RF-7): quien, que, cuando, sobre que registro,
 * desde donde y si funciono. Escribe en la tabla `auditoria` a traves del puerto
 * AUDITORIA_WRITER, asi que este archivo no conoce TypeORM.
 *
 * Registra tambien los intentos FALLIDOS (403, 409, 400...): un intento de
 * validar una recompensa sin permiso es justo lo que un auditor quiere ver.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly bitacora: AuditoriaWriterPort,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.leerMetadata(context);
    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();

    return next.handle().pipe(
      tap({
        next: (respuesta: unknown) => void this.registrar(metadata, request, respuesta, true),
        error: () => void this.registrar(metadata, request, undefined, false),
      }),
    );
  }

  private leerMetadata(context: ExecutionContext): MetadataAuditoria | null {
    const valor = this.reflector.get<MetadataAuditoria | string | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );
    if (!valor) return null;
    // Compatibilidad con la firma anterior @Audit('ACCION').
    return typeof valor === 'string' ? { accion: valor } : valor;
  }

  private registrar(
    metadata: MetadataAuditoria,
    request: Request & { user?: AuthenticatedUser },
    respuesta: unknown,
    exitoso: boolean,
  ): Promise<void> {
    const params = (request.params ?? {}) as Record<string, string | undefined>;
    // Este interceptor envuelve al de transformacion: la respuesta llega como
    // { success, data }. Se desenvuelve para encontrar el id creado.
    const sobre = this.comoObjeto(respuesta);
    const cuerpoRespuesta = this.comoObjeto(sobre?.data) ?? sobre;
    const usuarioRespuesta = this.comoObjeto(cuerpoRespuesta?.usuario);

    const registro: RegistroAuditoria = {
      usuarioId: request.user?.id ?? this.texto(usuarioRespuesta?.id),
      rol: request.user?.rol ?? this.texto(usuarioRespuesta?.rol),
      accion: metadata.accion,
      tipoAccion: metadata.tipo ?? this.tipoPorMetodo(request.method),
      entidad: metadata.entidad ?? null,
      entidadId: params.id ?? params.criminalId ?? this.texto(cuerpoRespuesta?.id),
      valorNuevo: this.sanitizar(request.body),
      metodo: request.method,
      ruta: request.originalUrl.replace(/([?&]token=)[^&]*/i, '$1***'),
      ip: request.ip ?? null,
      exitoso,
    };

    return this.bitacora.registrar(registro);
  }

  private tipoPorMetodo(metodo: string): RegistroAuditoria['tipoAccion'] {
    if (metodo === 'POST') return 'CREACION';
    if (metodo === 'DELETE') return 'ELIMINACION_LOGICA';
    if (metodo === 'GET') return 'CONSULTA';
    return 'ACTUALIZACION';
  }

  private sanitizar(cuerpo: unknown): unknown {
    const objeto = this.comoObjeto(cuerpo);
    if (!objeto) return null;
    return Object.fromEntries(
      Object.entries(objeto).map(([clave, valor]) => [
        clave,
        CAMPOS_SENSIBLES.test(clave)
          ? '***'
          : typeof valor === 'string' && valor.length > MAX_TEXTO
            ? `[omitido: ${valor.length} caracteres]`
            : valor,
      ]),
    );
  }

  private comoObjeto(valor: unknown): Record<string, unknown> | null {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : null;
  }

  private texto(valor: unknown): string | null {
    return typeof valor === 'string' ? valor : null;
  }
}
