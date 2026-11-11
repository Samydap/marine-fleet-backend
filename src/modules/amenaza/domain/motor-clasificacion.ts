import { DomainError } from '../../../shared/domain/errors/domain.error';
import { NivelAmenaza, SEVERIDAD } from '../../../shared/domain/value-objects/nivel-amenaza.enum';

/** Umbral de bounty vigente, leido de la tabla `criterios_amenaza`. */
export interface CriterioVigente {
  readonly nivel: NivelAmenaza;
  readonly montoMinimo: number;
  readonly montoMaximo: number | null;
}

/** Peso de la zona de influencia: Grand Line pesa mas que los Cuatro Mares. */
export interface ContextoZona {
  readonly esGrandLine: boolean;
  readonly cercanaACuartelGeneral: boolean;
}

export interface ResultadoClasificacion {
  readonly nivel: NivelAmenaza;
  readonly nivelBase: NivelAmenaza;
  readonly escalado: boolean;
  readonly justificacion: string;
}

/**
 * RF-5. NUCLEO DEL MODULO: clasificacion automatica de amenaza a partir del
 * bounty mas la zona de influencia.
 *
 * Es una funcion pura: sin NestJS, sin base de datos, sin HTTP. Los criterios
 * entran como parametro porque son configurables en la tabla. Esto es lo que
 * permite probar las ~12 combinaciones de la regla en milisegundos.
 */
export function clasificarAmenaza(
  bounty: number | null,
  criterios: readonly CriterioVigente[],
  zona?: ContextoZona,
): ResultadoClasificacion {
  if (bounty === null || bounty <= 0) {
    return {
      nivel: NivelAmenaza.PENDIENTE,
      nivelBase: NivelAmenaza.PENDIENTE,
      escalado: false,
      justificacion: 'Sin recompensa vigente: queda pendiente de clasificacion.',
    };
  }

  const aplicables = criterios.filter((c) => c.nivel !== NivelAmenaza.PENDIENTE);
  if (aplicables.length === 0) {
    throw new DomainError(
      'No hay criterios de amenaza vigentes configurados.',
      'SIN_CRITERIOS_AMENAZA',
    );
  }

  const coincidencia = aplicables.find(
    (c) => bounty >= c.montoMinimo && (c.montoMaximo === null || bounty <= c.montoMaximo),
  );

  // Si el bounty supera todos los rangos, cae en el criterio mas severo.
  const nivelBase =
    coincidencia?.nivel ??
    [...aplicables].sort((a, b) => SEVERIDAD[b.nivel] - SEVERIDAD[a.nivel])[0].nivel;

  const debeEscalar =
    nivelBase !== NivelAmenaza.ALTO &&
    Boolean(zona && (zona.esGrandLine || zona.cercanaACuartelGeneral));

  if (!debeEscalar) {
    return {
      nivel: nivelBase,
      nivelBase,
      escalado: false,
      justificacion: `Bounty de ${bounty} clasifica como ${nivelBase}.`,
    };
  }

  const nivelEscalado = nivelBase === NivelAmenaza.BAJO ? NivelAmenaza.MEDIO : NivelAmenaza.ALTO;

  return {
    nivel: nivelEscalado,
    nivelBase,
    escalado: true,
    justificacion:
      `Bounty de ${bounty} clasifica como ${nivelBase}, escalado a ${nivelEscalado} ` +
      `por operar en zona de alta sensibilidad.`,
  };
}
