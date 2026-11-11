import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ConcurrencyError } from '../../shared/domain/errors/concurrency.error';
import { DomainError } from '../../shared/domain/errors/domain.error';
import { ForbiddenError } from '../../shared/domain/errors/forbidden.error';
import { NotFoundError } from '../../shared/domain/errors/not-found.error';

/**
 * Traduce excepciones a HTTP en un solo lugar: los casos de uso lanzan errores
 * de dominio y no conocen codigos HTTP.
 *
 * Regla de seguridad: un error inesperado nunca filtra su mensaje al cliente.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, codigo } = this.traducir(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      error: { codigo, message, status },
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private traducir(exception: unknown): { status: number; message: string; codigo: string } {
    if (exception instanceof NotFoundError) {
      return { status: HttpStatus.NOT_FOUND, message: exception.message, codigo: exception.codigo };
    }

    if (exception instanceof ForbiddenError) {
      return { status: HttpStatus.FORBIDDEN, message: exception.message, codigo: exception.codigo };
    }

    if (exception instanceof ConcurrencyError) {
      return { status: HttpStatus.CONFLICT, message: exception.message, codigo: exception.codigo };
    }

    if (exception instanceof DomainError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: exception.message,
        codigo: exception.codigo,
      };
    }

    if (exception instanceof HttpException) {
      const respuesta = exception.getResponse();
      const message =
        typeof respuesta === 'string'
          ? respuesta
          : ((respuesta as { message?: string | string[] }).message ?? exception.message);
      return {
        status: exception.getStatus(),
        message: Array.isArray(message) ? message.join('; ') : message,
        codigo: 'HTTP',
      };
    }

    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as { code?: string } | undefined;
      if (driverError?.code === 'ER_DUP_ENTRY') {
        return {
          status: HttpStatus.CONFLICT,
          message: 'El registro ya existe.',
          codigo: 'DUPLICADO',
        };
      }
      if (driverError?.code === 'ER_NO_REFERENCED_ROW_2') {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Una referencia enviada no existe.',
          codigo: 'FK_INVALIDA',
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor.',
      codigo: 'INTERNO',
    };
  }
}
