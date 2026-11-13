import { SetMetadata } from '@nestjs/common';

export const CON_NOMBRES_KEY = 'respuesta:conNombres';

/**
 * Campos de la respuesta que traen ids y deben ir acompañados de su nombre.
 * Un campo puede estar dentro de una lista: `'participaciones[].baseNavalId'`.
 *
 *  - usuarios:   `validadaPor`  -> agrega `validadaPorNombre`
 *  - criminales: `criminalId`   -> agrega `criminalNombre` y `criminalFotoUrl`
 *  - bases:      `baseNavalId`  -> agrega `baseNavalNombre`
 */
export interface CamposConNombre {
  readonly usuarios?: readonly string[];
  readonly criminales?: readonly string[];
  readonly bases?: readonly string[];
}

/**
 * Pide al NombresInterceptor que complete los nombres de los ids que trae la
 * respuesta. Se pone en el controller (aplica a todos sus endpoints) o en un
 * metodo. Los ids NO se quitan: el frontend los sigue usando para enlazar.
 *
 * @example @ConNombres({ criminales: ['criminalId'], usuarios: ['solicitadaPor', 'validadaPor'] })
 */
export const ConNombres = (campos: CamposConNombre): ClassDecorator & MethodDecorator =>
  SetMetadata(CON_NOMBRES_KEY, campos);
