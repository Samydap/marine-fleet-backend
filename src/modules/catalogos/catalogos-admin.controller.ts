import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';
import { RequierePermisos } from '../../common/decorators/roles.decorator';
import { ParseIdPipe } from '../../common/pipes/parse-uuid.pipe';
import { Permiso } from '../../shared/domain/rbac/permiso.enum';
import { CatalogosAdminService, type DetalleBaseNaval } from './catalogos-admin.service';
import {
  ActualizarBaseNavalDto,
  ActualizarMarDto,
  ActualizarZonaDto,
  CrearBaseNavalDto,
  CrearMarDto,
  CrearZonaDto,
} from './dto/catalogos.dto';
import type { BaseNaval } from './entities/base-naval.entity';
import type { Mar } from './entities/mar.entity';
import type { ZonaInfluencia } from './entities/zona-influencia.entity';

/**
 * Administracion de catalogos. Las lecturas siguen en CatalogosController (las
 * usa cualquier usuario autenticado para llenar filtros); las escrituras exigen
 * CATALOGOS_ADMINISTRAR (Almirante y Coordinador de Operaciones).
 */
@ApiTags('catalogos')
@ApiBearerAuth()
@Controller({ path: 'catalogos', version: '1' })
export class CatalogosAdminController {
  constructor(private readonly admin: CatalogosAdminService) {}

  @Get('bases-navales/:id')
  @ApiOperation({ summary: 'Detalle de una base: usuarios asignados y operativos activos' })
  detalleBase(@Param('id', ParseIdPipe) id: string): Promise<DetalleBaseNaval> {
    return this.admin.detalleBase(id);
  }

  @Post('mares')
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.CATALOGOS_ADMINISTRAR)
  @Audit('CREAR_MAR', { entidad: 'mar', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Registra un mar' })
  crearMar(@Body() dto: CrearMarDto): Promise<Mar> {
    return this.admin.crearMar(dto);
  }

  @Patch('mares/:id')
  @RequierePermisos(Permiso.CATALOGOS_ADMINISTRAR)
  @Audit('ACTUALIZAR_MAR', { entidad: 'mar', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Actualiza o desactiva un mar' })
  actualizarMar(@Param('id', ParseIdPipe) id: string, @Body() dto: ActualizarMarDto): Promise<Mar> {
    return this.admin.actualizarMar(id, dto);
  }

  @Post('zonas-influencia')
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.CATALOGOS_ADMINISTRAR)
  @Audit('CREAR_ZONA', { entidad: 'zona_influencia', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Registra una zona de influencia dentro de un mar' })
  crearZona(@Body() dto: CrearZonaDto): Promise<ZonaInfluencia> {
    return this.admin.crearZona(dto);
  }

  @Patch('zonas-influencia/:id')
  @RequierePermisos(Permiso.CATALOGOS_ADMINISTRAR)
  @Audit('ACTUALIZAR_ZONA', { entidad: 'zona_influencia', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Actualiza o desactiva una zona de influencia' })
  actualizarZona(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: ActualizarZonaDto,
  ): Promise<ZonaInfluencia> {
    return this.admin.actualizarZona(id, dto);
  }

  @Post('bases-navales')
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.CATALOGOS_ADMINISTRAR)
  @Audit('CREAR_BASE_NAVAL', { entidad: 'base_naval', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Registra una base naval (ubicacion, zona y comandante)' })
  crearBase(@Body() dto: CrearBaseNavalDto): Promise<BaseNaval> {
    return this.admin.crearBase(dto);
  }

  @Patch('bases-navales/:id')
  @RequierePermisos(Permiso.CATALOGOS_ADMINISTRAR)
  @Audit('ACTUALIZAR_BASE_NAVAL', { entidad: 'base_naval', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Actualiza una base naval o la marca INACTIVA' })
  actualizarBase(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: ActualizarBaseNavalDto,
  ): Promise<BaseNaval> {
    return this.admin.actualizarBase(id, dto);
  }
}
