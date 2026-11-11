import { DomainError } from '../errors/domain.error';

/**
 * Monto de recompensa. Value object: inmutable y con sus invariantes dentro.
 * La moneda del universo es BERRIES; el esquema usa NUMERIC(15,2) con CHECK >= 0.
 */
export class Bounty {
  static readonly MONEDA_POR_DEFECTO = 'BERRIES';
  static readonly MONTO_MAXIMO = 9_999_999_999_999.99;

  private constructor(
    readonly monto: number,
    readonly moneda: string,
  ) {}

  static crear(monto: number, moneda: string = Bounty.MONEDA_POR_DEFECTO): Bounty {
    if (!Number.isFinite(monto)) {
      throw new DomainError('El monto de la recompensa debe ser un numero valido.');
    }
    if (monto < 0) {
      throw new DomainError('El monto de la recompensa no puede ser negativo.');
    }
    if (monto > Bounty.MONTO_MAXIMO) {
      throw new DomainError('El monto de la recompensa excede el maximo permitido.');
    }
    return new Bounty(Math.round(monto * 100) / 100, moneda);
  }

  static cero(): Bounty {
    return new Bounty(0, Bounty.MONEDA_POR_DEFECTO);
  }

  esMayorQue(otra: Bounty): boolean {
    return this.monto > otra.monto;
  }

  equals(otra: Bounty): boolean {
    return this.monto === otra.monto && this.moneda === otra.moneda;
  }

  toString(): string {
    return `${this.monto.toLocaleString('es-CO')} ${this.moneda}`;
  }
}
