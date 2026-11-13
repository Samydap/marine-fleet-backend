import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../../common/decorators/audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequierePermisos } from '../../../common/decorators/roles.decorator';
import { ParseIdPipe } from '../../../common/pipes/parse-uuid.pipe';
import type { PageResult } from '../../../shared/application/pagination/page-result';
import type { AuthenticatedUser } from '../../../shared/domain/rbac/authenticated-user';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { ActualizarUsuarioUseCase } from '../application/actualizar-usuario.use-case';
import { CambiarContrasenaUseCase } from '../application/cambiar-contrasena.use-case';
import { CrearUsuarioUseCase } from '../application/crear-usuario.use-case';
import {
  ListarRolesUseCase,
  ListarUsuariosUseCase,
  ObtenerUsuarioUseCase,
} from '../application/listar-usuarios.use-case';
import {
  ActualizarUsuarioDto,
  CambiarMiContrasenaDto,
  CrearUsuarioDto,
  FiltrarUsuariosDto,
  RestablecerContrasenaDto,
} from './dto/usuario.dto';
import {
  aRolResponse,
  aUsuarioResponse,
  type RolResponse,
  type UsuarioResponse,
} from './mappers/usuario.mapper';

/** RF-7: administracion de cuentas. Lo opera el Especialista en Seguridad. */
@ApiTags('usuarios')
@ApiBearerAuth()
@Controller({ path: 'usuarios', version: '1' })
export class UsuariosController {
  constructor(
    private readonly crearUsuario: CrearUsuarioUseCase,
    private readonly actualizarUsuario: ActualizarUsuarioUseCase,
    private readonly cambiarContrasena: CambiarContrasenaUseCase,
    private readonly listarUsuarios: ListarUsuariosUseCase,
    private readonly obtenerUsuario: ObtenerUsuarioUseCase,
    private readonly listarRoles: ListarRolesUseCase,
  ) {}

  @Get()
  @RequierePermisos(Permiso.USUARIOS_ADMINISTRAR)
  @ApiOperation({ summary: 'Lista usuarios con filtros por rol, base y estado' })
  async listar(@Query() filtro: FiltrarUsuariosDto): Promise<PageResult<UsuarioResponse>> {
    const pagina = await this.listarUsuarios.execute({
      q: filtro.q,
      rol: filtro.rol,
      baseNavalId: filtro.baseNavalId,
      estado: filtro.estado,
      page: filtro.page,
      limit: filtro.limit,
      order: filtro.order,
    });
    return pagina.map(aUsuarioResponse);
  }

  @Get('roles')
  @RequierePermisos(Permiso.USUARIOS_ADMINISTRAR)
  @ApiOperation({ summary: 'Catalogo de roles con su matriz de permisos' })
  async roles(): Promise<RolResponse[]> {
    return (await this.listarRoles.execute()).map(aRolResponse);
  }

  @Patch('me/contrasena')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit('CAMBIAR_MI_CONTRASENA', { entidad: 'usuario', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'El usuario autenticado cambia su propia contraseña' })
  async cambiarMiContrasena(
    @Body() dto: CambiarMiContrasenaDto,
    @CurrentUser('id') usuarioId: string,
  ): Promise<void> {
    await this.cambiarContrasena.execute({
      usuarioId,
      passwordActual: dto.passwordActual,
      nuevaPassword: dto.nuevaPassword,
    });
  }

  @Get(':id')
  @RequierePermisos(Permiso.USUARIOS_ADMINISTRAR)
  @ApiOperation({ summary: 'Detalle de un usuario' })
  async detalle(@Param('id', ParseIdPipe) id: string): Promise<UsuarioResponse> {
    return aUsuarioResponse(await this.obtenerUsuario.execute(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequierePermisos(Permiso.USUARIOS_ADMINISTRAR)
  @Audit('CREAR_USUARIO', { entidad: 'usuario', tipo: 'CREACION' })
  @ApiOperation({ summary: 'Crea una cuenta con rol y base naval' })
  async crear(
    @Body() dto: CrearUsuarioDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UsuarioResponse> {
    const usuario = await this.crearUsuario.execute({
      nombreCompleto: dto.nombreCompleto,
      email: dto.email,
      password: dto.password,
      rol: dto.rol,
      baseNavalId: dto.baseNavalId ?? null,
      actorPermisos: actor.permisos,
    });
    return aUsuarioResponse(usuario);
  }

  @Patch(':id')
  @RequierePermisos(Permiso.USUARIOS_ADMINISTRAR)
  @Audit('ACTUALIZAR_USUARIO', { entidad: 'usuario', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Cambia nombre, rol, base o estado (activar / bloquear / desbloquear)' })
  async actualizar(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: ActualizarUsuarioDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UsuarioResponse> {
    const usuario = await this.actualizarUsuario.execute({
      usuarioId: id,
      version: dto.version,
      nombreCompleto: dto.nombreCompleto,
      rol: dto.rol,
      baseNavalId: dto.baseNavalId,
      estado: dto.estado,
      actorId: actor.id,
      actorPermisos: actor.permisos,
    });
    return aUsuarioResponse(usuario);
  }

  @Patch(':id/contrasena')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequierePermisos(Permiso.USUARIOS_ADMINISTRAR)
  @Audit('RESTABLECER_CONTRASENA', { entidad: 'usuario', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Restablece la contraseña de otro usuario' })
  async restablecer(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: RestablecerContrasenaDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.cambiarContrasena.execute({
      usuarioId: id,
      nuevaPassword: dto.nuevaPassword,
      actorPermisos: actor.permisos,
    });
  }
}
