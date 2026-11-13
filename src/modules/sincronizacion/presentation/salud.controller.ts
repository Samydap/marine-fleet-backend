import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ObtenerSaludUseCase, type EstadoSalud } from '../application/obtener-salud.use-case';

@ApiTags('sincronizacion')
@Controller({ path: 'salud', version: '1' })
export class SaludController {
  constructor(private readonly salud: ObtenerSaludUseCase) {}

  /** @Public() justificado: lo consulta un monitor externo, sin sesion. */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Estado del API y de la base de datos (monitoreo del 99 %)' })
  estado(): Promise<EstadoSalud> {
    return this.salud.execute();
  }
}
