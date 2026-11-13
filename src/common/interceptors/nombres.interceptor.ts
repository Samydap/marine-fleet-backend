import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mergeMap, type Observable } from 'rxjs';
import type { CriminalNombrado, NombresLookupPort } from '../../shared/domain/lookup/nombres.port';
import { CON_NOMBRES_KEY, type CamposConNombre } from '../decorators/con-nombres.decorator';

type Fila = Record<string, unknown>;
type Tipo = 'usuarios' | 'criminales' | 'bases';

interface Objetivo {
  readonly tipo: Tipo;
  readonly fila: Fila;
  readonly campo: string;
}

const esObjeto = (v: unknown): v is Fila =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && !Buffer.isBuffer(v);

/** `criminalId` -> `criminal`; `validadaPor` se queda igual. */
const raiz = (campo: string): string => campo.replace(/Id$/, '');

/**
 * Completa los nombres de los ids que trae una respuesta (ver @ConNombres).
 *
 * Por que un interceptor y no cada mapper: los mappers son sincronos y puros;
 * buscar nombres es una consulta. Aqui se hace UNA consulta por tipo de entidad
 * para todas las filas de la respuesta juntas (sin N+1), y los casos de uso no
 * se enteran.
 */
@Injectable()
export class NombresInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly lookup: NombresLookupPort,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const campos = this.reflector.getAllAndOverride<CamposConNombre | undefined>(CON_NOMBRES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!campos) return next.handle();

    return next.handle().pipe(
      mergeMap(async (respuesta: unknown) => {
        await this.completar(this.filasRaiz(respuesta), campos);
        return respuesta;
      }),
    );
  }

  /** Una respuesta puede ser un objeto, una lista o una pagina `{ data, meta }`. */
  private filasRaiz(respuesta: unknown): Fila[] {
    if (Array.isArray(respuesta)) return respuesta.filter(esObjeto);
    if (esObjeto(respuesta) && Array.isArray(respuesta.data) && esObjeto(respuesta.meta)) {
      return respuesta.data.filter(esObjeto);
    }
    return esObjeto(respuesta) ? [respuesta] : [];
  }

  private async completar(filas: Fila[], campos: CamposConNombre): Promise<void> {
    const objetivos = this.recolectar(filas, campos);
    if (objetivos.length === 0) return;

    const ids = (tipo: Tipo): string[] =>
      objetivos
        .filter((o) => o.tipo === tipo)
        .map((o) => o.fila[o.campo])
        .filter((v): v is string => typeof v === 'string');

    const [usuarios, criminales, bases] = await Promise.all([
      this.lookup.usuarios(ids('usuarios')),
      this.lookup.criminales(ids('criminales')),
      this.lookup.bases(ids('bases')),
    ]);

    for (const objetivo of objetivos) this.asignar(objetivo, usuarios, criminales, bases);
  }

  /** Cada (fila, campo) a completar, incluidos los que estan dentro de listas `x[].campo`. */
  private recolectar(filas: Fila[], campos: CamposConNombre): Objetivo[] {
    const objetivos: Objetivo[] = [];
    for (const tipo of ['usuarios', 'criminales', 'bases'] as const) {
      for (const ruta of campos[tipo] ?? []) {
        const [lista, campo] = ruta.includes('[].') ? ruta.split('[].') : [null, ruta];
        for (const fila of filas) {
          const destinos = lista ? this.hijos(fila, lista) : [fila];
          for (const destino of destinos) objetivos.push({ tipo, fila: destino, campo });
        }
      }
    }
    return objetivos;
  }

  private hijos(fila: Fila, lista: string): Fila[] {
    const valor = fila[lista];
    return Array.isArray(valor) ? valor.filter(esObjeto) : [];
  }

  private asignar(
    { tipo, fila, campo }: Objetivo,
    usuarios: Map<string, string>,
    criminales: Map<string, CriminalNombrado>,
    bases: Map<string, string>,
  ): void {
    const id = typeof fila[campo] === 'string' ? (fila[campo] as string) : null;
    const nombre = `${raiz(campo)}Nombre`;
    if (tipo === 'criminales') {
      const criminal = id ? criminales.get(id) : undefined;
      fila[nombre] = criminal?.nombre ?? null;
      fila[`${raiz(campo)}FotoUrl`] = criminal?.fotoUrl ?? null;
      return;
    }
    const mapa = tipo === 'usuarios' ? usuarios : bases;
    fila[nombre] = id ? (mapa.get(id) ?? null) : null;
  }
}
