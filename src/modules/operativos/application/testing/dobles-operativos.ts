import type { EventEmitter2 } from '@nestjs/event-emitter';
import { PageResult } from '../../../../shared/application/pagination/page-result';
import { Permiso } from '../../../../shared/domain/rbac/permiso.enum';
import type {
  CriminalReaderPort,
  CriminalResumen,
} from '../../../criminales/domain/criminal.repository.port';
import { EstadoCriminal, NivelAmenaza } from '../../../criminales/domain/estado-criminal.enum';
import {
  EstadoOperativo,
  PrioridadOperativo,
  RolParticipacion,
} from '../../domain/estado-operativo.enum';
import { Operativo } from '../../domain/operativo.entity';
import type {
  FiltroOperativos,
  OperativoRepositoryPort,
  ReferenciasOperativoPort,
} from '../../domain/operativo.repository.port';
import { ParticipacionBase } from '../../domain/participacion-base.entity';
import type { BaseCandidata } from '../../domain/politica-asignacion';
import type { ResponsableOperativo } from '../../domain/responsable-operativo.entity';
import type { UsuarioOperativo } from '../operativo-helpers';

/** Dobles en memoria para probar los casos de uso sin base de datos. */
export class OperativosEnMemoria implements OperativoRepositoryPort {
  readonly operativos = new Map<string, Operativo>();
  participacionesGuardadas: ParticipacionBase[] = [];
  responsablesGuardados: ResponsableOperativo[] = [];
  ultimoFiltro: FiltroOperativos | null = null;

  buscarPorId(id: string): Promise<Operativo | null> {
    return Promise.resolve(this.operativos.get(id) ?? null);
  }
  listar(filtro: FiltroOperativos): Promise<PageResult<Operativo>> {
    this.ultimoFiltro = filtro;
    const data = [...this.operativos.values()];
    return Promise.resolve(new PageResult(data, data.length, filtro.page, filtro.limit));
  }
  guardar(operativo: Operativo): Promise<Operativo> {
    operativo.version = Number(operativo.version ?? 0) + 1;
    this.operativos.set(operativo.id, operativo);
    return Promise.resolve(operativo);
  }
  guardarParticipaciones(participaciones: ParticipacionBase[]): Promise<void> {
    this.participacionesGuardadas.push(...participaciones);
    return Promise.resolve();
  }
  guardarResponsables(responsables: ResponsableOperativo[]): Promise<void> {
    this.responsablesGuardados.push(...responsables);
    return Promise.resolve();
  }
  contarDelAnio(): Promise<number> {
    return Promise.resolve(this.operativos.size);
  }
  contarIncidentesVinculados(): Promise<number> {
    return Promise.resolve(2);
  }
}

export const BASES: BaseCandidata[] = [
  { id: 'b-loguetown', zonaInfluenciaId: 'z-loguetown', activa: true },
  { id: 'b-g5', zonaInfluenciaId: 'z-wano', activa: true },
  { id: 'b-cerrada', zonaInfluenciaId: 'z-wano', activa: false },
];

export class ReferenciasFalsas implements ReferenciasOperativoPort {
  usuarios = ['u-capitan', 'u-coordinador'];

  obtenerBases(ids: readonly string[]): Promise<BaseCandidata[]> {
    return Promise.resolve(BASES.filter((b) => ids.includes(b.id)));
  }
  listarBasesActivas(): Promise<BaseCandidata[]> {
    return Promise.resolve(BASES.filter((b) => b.activa));
  }
  usuariosActivos(ids: readonly string[]): Promise<string[]> {
    return Promise.resolve(this.usuarios.filter((u) => ids.includes(u)));
  }
  zonaExiste(zonaId: string): Promise<boolean> {
    return Promise.resolve(['z-wano', 'z-loguetown'].includes(zonaId));
  }
}

export function resumenCriminal(cambios: Partial<CriminalResumen> = {}): CriminalResumen {
  return {
    id: 'c-luffy',
    nombre: 'Monkey D. Luffy',
    alias: [],
    estado: EstadoCriminal.ACTIVO,
    nivelAmenaza: NivelAmenaza.ALTO,
    recompensaVigenteMonto: 3_000_000_000,
    zonaInfluenciaId: 'z-wano',
    fotoUrl: null,
    organizacion: null,
    ...cambios,
  };
}

/**
 * Lector de criminales falso. Implementa solo lo que Operativos e Incidentes
 * usan; el cast evita que un metodo nuevo del puerto (que estos modulos no
 * llaman) rompa sus pruebas.
 */
export function lectorCriminales(criminales: CriminalResumen[]): CriminalReaderPort {
  const lector: Pick<CriminalReaderPort, 'obtenerResumen' | 'existe' | 'obtenerResumenes'> = {
    obtenerResumen: (id) => Promise.resolve(criminales.find((c) => c.id === id) ?? null),
    existe: (id) => Promise.resolve(criminales.some((c) => c.id === id)),
    obtenerResumenes: (ids) => Promise.resolve(criminales.filter((c) => ids.includes(c.id))),
  };
  return lector as CriminalReaderPort;
}

/** Emisor falso: recuerda lo emitido sin ejecutar oyentes. */
export function eventosFalsos(): {
  emisor: EventEmitter2;
  emitidos: Array<{ nombre: string; datos: unknown }>;
} {
  const emitidos: Array<{ nombre: string; datos: unknown }> = [];
  const emisor = {
    emit: (nombre: string, datos: unknown): boolean => {
      emitidos.push({ nombre, datos });
      return true;
    },
  } as unknown as EventEmitter2;
  return { emisor, emitidos };
}

export const COORDINADOR_GLOBAL: UsuarioOperativo = {
  id: 'u-coordinador',
  permisos: [Permiso.OPERATIVOS_COORDINAR],
  baseNavalId: null,
};

export const CAPITAN_LOGUETOWN: UsuarioOperativo = {
  id: 'u-capitan',
  permisos: [Permiso.OPERATIVOS_COORDINAR],
  baseNavalId: 'b-loguetown',
};

export function operativoDePrueba(cambios: Partial<Operativo> = {}): Operativo {
  const lider = Object.assign(new ParticipacionBase(), {
    id: 'p-lider',
    operativoId: 'op-1',
    baseNavalId: 'b-g5',
    rolParticipacion: RolParticipacion.LIDER,
    unidadesAsignadas: 5,
    recursos: null,
    confirmada: true,
    observaciones: null,
  });
  return Object.assign(new Operativo(), {
    id: 'op-1',
    codigo: 'OP-2026-0001',
    nombre: 'Captura en Wano',
    objetivoCriminalId: 'c-luffy',
    objetivo: null,
    descripcion: null,
    zonaInfluenciaId: 'z-wano',
    baseLiderId: 'b-g5',
    estado: EstadoOperativo.PLANIFICADO,
    prioridad: PrioridadOperativo.MEDIA,
    fechaInicioPlaneada: new Date('2026-11-20T00:00:00Z'),
    fechaInicioReal: null,
    fechaCierre: null,
    resultadoFinal: null,
    observacionesCierre: null,
    creadoPor: 'u-coordinador',
    version: 1,
    bases: [lider],
    responsables: [],
    ...cambios,
  });
}
