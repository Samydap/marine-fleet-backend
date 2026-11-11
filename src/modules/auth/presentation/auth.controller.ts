import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { LoginUseCase } from '../application/login.use-case';
import { ObtenerSesionUseCase } from '../application/obtener-sesion.use-case';
import { LoginDto } from './dto/login.dto';
import { aUsuarioSesion, LoginResponseDto, UsuarioSesionDto } from './dto/sesion.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly obtenerSesion: ObtenerSesionUseCase,
  ) {}

  /**
   * @Public() justificado: es la puerta de entrada, no puede exigir token.
   * Responde 200 y no 201 porque no crea un recurso consultable.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inicia sesion con correo y contraseña',
    description:
      'Devuelve el access token, el refresh token y el usuario con sus permisos. ' +
      'Tras varios intentos fallidos consecutivos la cuenta queda bloqueada.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Correo o contraseña incorrectos' })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const sesion = await this.loginUseCase.execute({ email: dto.email, password: dto.password });

    return {
      accessToken: sesion.accessToken,
      refreshToken: sesion.refreshToken,
      usuario: aUsuarioSesion(sesion.usuario),
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Devuelve el usuario de la sesion actual',
    description: 'El frontend lo usa para restaurar la sesion al recargar la pagina.',
  })
  @ApiOkResponse({ type: UsuarioSesionDto })
  async me(@CurrentUser('id') usuarioId: string): Promise<UsuarioSesionDto> {
    return aUsuarioSesion(await this.obtenerSesion.execute(usuarioId));
  }
}
