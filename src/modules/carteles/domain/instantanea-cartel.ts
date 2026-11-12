import type { CriminalResumen } from '../../criminales/domain/criminal.repository.port';
import type { DatosCartel } from './cartel-renderer.port';

export const TEXTO_LEGAL =
  'Por orden del Gobierno Mundial y de la Marina. Toda informacion sobre su paradero ' +
  'debe reportarse a la base naval mas cercana.';

/** Convierte el resumen del criminal en la instantanea que se imprime. */
export function construirInstantanea(resumen: CriminalResumen): DatosCartel {
  return {
    criminalId: resumen.id,
    nombre: resumen.nombre,
    alias: [...resumen.alias],
    recompensa: resumen.recompensaVigenteMonto,
    moneda: 'BERRIES',
    nivelAmenaza: resumen.nivelAmenaza,
    estado: resumen.estado,
    organizacion: resumen.organizacion?.nombre ?? null,
    categoriaOrganizacion: resumen.organizacion?.categoria ?? null,
    fotoUrl: resumen.fotoUrl,
    textoLegal: TEXTO_LEGAL,
  };
}

/** Campos que, si cambian, hacen que el cartel impreso quede desactualizado. */
const CAMPOS_RELEVANTES: ReadonlyArray<keyof DatosCartel> = [
  'nombre',
  'alias',
  'recompensa',
  'nivelAmenaza',
  'estado',
  'organizacion',
  'fotoUrl',
];

/**
 * IDEMPOTENCIA: si la instantanea nueva es igual a la vigente, no se emite
 * version. Gracias a esto, que dos eventos lleguen por el mismo cambio (p. ej.
 * RECOMPENSA y AMENAZA_RECLASIFICADA) no produce dos carteles iguales.
 */
export function mismaInstantanea(
  vigente: Partial<Record<keyof DatosCartel, unknown>> | null,
  nueva: DatosCartel,
): boolean {
  if (!vigente) return false;
  return CAMPOS_RELEVANTES.every(
    (campo) => JSON.stringify(vigente[campo] ?? null) === JSON.stringify(nueva[campo] ?? null),
  );
}

/** Ruta en el almacenamiento a partir de la URL publica `/api/v1/archivos/<ruta>`. */
export function rutaDesdeUrl(url: string): string {
  return url.replace(/^\/?api\/v1\/archivos\//, '').replace(/^\/+/, '');
}

export function formatearBerries(monto: number | null): string {
  if (monto === null) return 'SIN RECOMPENSA';
  return `${Math.round(monto).toLocaleString('es-CO')} BERRIES`;
}
