import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { BuscarCriminalesUseCase } from '../application/buscar-criminales.use-case';
import { EstadoCriminal } from '../domain/estado-criminal.enum';
import { BuscarPublicoDto } from './dto/buscar-publico.dto';

/** Lo minimo que se puede mostrar a un ciudadano: lo mismo que trae un cartel publicado. */
export interface BuscadoPublicoResponse {
  id: string;
  nombre: string;
  alias: string[];
  fotoUrl: string | null;
  recompensaVigenteMonto: number | null;
  nivelAmenaza: string;
  organizacion: string | null;
}

/**
 * Lista publica de criminales buscados (RF-3).
 *
 * @Public() justificado: el formulario `/reportar` es para ciudadanos sin
 * cuenta y necesita encontrar al criminal por nombre o alias. Solo expone los
 * datos que ya son publicos en un cartel WANTED, y solo de criminales ACTIVOS.
 * Nada de antecedentes, zona, base de origen ni auditoria.
 */
@ApiTags('buscados')
@Controller({ path: 'buscados', version: '1' })
export class BuscadosController {
  constructor(private readonly buscar: BuscarCriminalesUseCase) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Criminales buscados (publico)',
    description: 'Busca por nombre o alias entre los criminales activos. Sin sesion.',
  })
  async listar(@Query() dto: BuscarPublicoDto): Promise<BuscadoPublicoResponse[]> {
    const pagina = await this.buscar.execute({
      q: dto.q,
      estado: EstadoCriminal.ACTIVO,
      page: 1,
      limit: dto.limit ?? 12,
      order: 'DESC',
    });
    return pagina.data.map((c) => {
      const principal = c.membresiaPrincipal();
      return {
        id: c.id,
        nombre: c.nombre,
        alias: c.alias ?? [],
        fotoUrl: c.foto?.url ?? null,
        recompensaVigenteMonto:
          c.recompensaVigenteMonto === null ? null : Number(c.recompensaVigenteMonto),
        nivelAmenaza: c.nivelAmenaza,
        organizacion: principal?.organizacion?.nombre ?? null,
      };
    });
  }
}
