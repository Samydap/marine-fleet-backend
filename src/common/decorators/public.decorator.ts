import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Marca un endpoint como accesible sin token.
 *
 * Uso legitimo: login, health checks y el formulario de reporte ciudadano.
 * Durante el Sprint 1, mientras el guard de RBAC no esta en `develop`, los demas
 * devs pueden marcar sus controllers con @Public() y quitarlo antes del PR final.
 * Todo @Public() que sobreviva al PR debe venir justificado en la descripcion.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
