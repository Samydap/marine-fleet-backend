import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ForbiddenError } from '../../shared/domain/errors/forbidden.error';
import type { AuthenticatedUser } from '../../shared/domain/rbac/authenticated-user';
import { Permiso, tienePermiso } from '../../shared/domain/rbac/permiso.enum';
import { CatalogosService } from './catalogos.service';
import type { BaseNaval } from './entities/base-naval.entity';
import type { Mar } from './entities/mar.entity';
import type { ZonaInfluencia } from './entities/zona-influencia.entity';

const INCLUIR_INACTIVOS = {
  name: 'incluirInactivos',
  required: false,
  type: Boolean,
  description: 'true = incluye lo dado de baja (exige CATALOGOS_ADMINISTRAR)',
};

/**
 * Lectura de catalogos. Cualquier usuario autenticado ve lo activo; ver lo
 * inactivo es parte de administrar el catalogo, asi que exige ese permiso.
 */
function verInactivos(valor: string | undefined, usuario: AuthenticatedUser): boolean {
  if (valor !== 'true') return false;
  if (!tienePermiso(usuario.permisos, Permiso.CATALOGOS_ADMINISTRAR)) {
    throw new ForbiddenError('ver catalogos inactivos');
  }
  return true;
}

@ApiTags('catalogos')
@ApiBearerAuth()
@Controller({ path: 'catalogos', version: '1' })
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Get('mares')
  @ApiOperation({ summary: 'Lista los mares (activos, o todos con incluirInactivos)' })
  @ApiQuery(INCLUIR_INACTIVOS)
  mares(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query('incluirInactivos') incluirInactivos?: string,
  ): Promise<Mar[]> {
    return this.catalogos.listarMares(verInactivos(incluirInactivos, usuario));
  }

  @Get('zonas-influencia')
  @ApiOperation({ summary: 'Lista las zonas de influencia, filtrables por mar' })
  @ApiQuery(INCLUIR_INACTIVOS)
  zonas(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query('marId') marId?: string,
    @Query('incluirInactivos') incluirInactivos?: string,
  ): Promise<ZonaInfluencia[]> {
    return this.catalogos.listarZonas(marId, verInactivos(incluirInactivos, usuario));
  }

  @Get('bases-navales')
  @ApiOperation({ summary: 'Lista las bases navales, filtrables por zona' })
  @ApiQuery(INCLUIR_INACTIVOS)
  bases(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query('zonaInfluenciaId') zonaInfluenciaId?: string,
    @Query('incluirInactivos') incluirInactivos?: string,
  ): Promise<BaseNaval[]> {
    return this.catalogos.listarBases(zonaInfluenciaId, verInactivos(incluirInactivos, usuario));
  }
}
