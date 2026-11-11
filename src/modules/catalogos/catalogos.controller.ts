import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
import type { BaseNaval } from './entities/base-naval.entity';
import type { Mar } from './entities/mar.entity';
import type { ZonaInfluencia } from './entities/zona-influencia.entity';

@ApiTags('catalogos')
@ApiBearerAuth()
@Controller({ path: 'catalogos', version: '1' })
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Get('mares')
  @ApiOperation({ summary: 'Lista los mares activos' })
  mares(): Promise<Mar[]> {
    return this.catalogos.listarMares();
  }

  @Get('zonas-influencia')
  @ApiOperation({ summary: 'Lista las zonas de influencia, filtrables por mar' })
  zonas(@Query('marId') marId?: string): Promise<ZonaInfluencia[]> {
    return this.catalogos.listarZonas(marId);
  }

  @Get('bases-navales')
  @ApiOperation({ summary: 'Lista las bases navales activas, filtrables por zona' })
  bases(@Query('zonaInfluenciaId') zonaInfluenciaId?: string): Promise<BaseNaval[]> {
    return this.catalogos.listarBases(zonaInfluenciaId);
  }
}
