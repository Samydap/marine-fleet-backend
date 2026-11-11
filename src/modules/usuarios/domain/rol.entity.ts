import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import type { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { RolCodigo } from '../../../shared/domain/rbac/rol.enum';

/** RF-7. Tabla `roles`: la matriz de permisos se persiste en la columna JSON. */
@Entity('roles')
export class Rol extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  codigo!: RolCodigo;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'json' })
  permisos!: Permiso[];

  @Column({ name: 'requiere_2fa', type: 'tinyint', width: 1, default: 0 })
  requiere2fa!: boolean;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  activo!: boolean;
}
