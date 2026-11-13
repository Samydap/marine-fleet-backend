import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Audit } from '../../../common/decorators/audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { GestionarMfaUseCase } from '../application/gestionar-mfa.use-case';
import { esRetoMfa, LoginUseCase } from '../application/login.use-case';
import { VerifyMfaUseCase } from '../application/verify-mfa.use-case';
import { ObtenerSesionUseCase } from '../application/obtener-sesion.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import {
  CodigoMfaDto,
  EnrolamientoMfaResponseDto,
  RetoMfaResponseDto,
  VerifyMfaDto,
} from './dto/verify-mfa.dto';
import { aUsuarioSesion, LoginResponseDto, UsuarioSesionDto } from './dto/sesion.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly obtenerSesion: ObtenerSesionUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly verifyMfa: VerifyMfaUseCase,
    private readonly gestionarMfa: GestionarMfaUseCase,
  ) {}

  /**
   * @Public() justificado: es la puerta de entrada, no puede exigir token.
   * Responde 200 y no 201 porque no crea un recurso consultable.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Audit('INICIAR_SESION', { entidad: 'usuario', tipo: 'AUTENTICACION' })
  @ApiOperation({
    summary: 'Inicia sesion con correo y contraseña',
    description:
      'Devuelve el access token, el refresh token y el usuario con sus permisos. ' +
      'Si la cuenta tiene segundo factor, devuelve en cambio { mfaRequerido, challengeToken, email } ' +
      'y la sesion se completa en POST /auth/mfa/verify. ' +
      'Tras varios intentos fallidos consecutivos la cuenta queda bloqueada.',
  })
  @ApiOkResponse({
    type: LoginResponseDto,
    description: 'O RetoMfaResponseDto si hay segundo factor',
  })
  @ApiUnauthorizedResponse({ description: 'Correo o contraseña incorrectos' })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto | RetoMfaResponseDto> {
    const sesion = await this.loginUseCase.execute({ email: dto.email, password: dto.password });
    if (esRetoMfa(sesion)) return sesion;

    return {
      accessToken: sesion.accessToken,
      refreshToken: sesion.refreshToken,
      usuario: aUsuarioSesion(sesion.usuario),
    };
  }

  /** @Public() justificado: quien renueva tiene el access token vencido. */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Audit('RENOVAR_SESION', { entidad: 'usuario', tipo: 'AUTENTICACION' })
  @ApiOperation({
    summary: 'Renueva el access token con el refresh token',
    description: 'Devuelve un par nuevo de tokens con los permisos vigentes del usuario.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalido, expirado o cuenta bloqueada' })
  async refresh(@Body() dto: RefreshDto): Promise<LoginResponseDto> {
    const sesion = await this.refreshToken.execute(dto.refreshToken);
    return {
      accessToken: sesion.accessToken,
      refreshToken: sesion.refreshToken,
      usuario: aUsuarioSesion(sesion.usuario),
    };
  }

  /** @Public() justificado: es el segundo paso del login; aun no hay sesion. */
  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @Audit('VERIFICAR_MFA', { entidad: 'usuario', tipo: 'AUTENTICACION' })
  @ApiOperation({
    summary: 'Segundo paso del login: canjea el reto y el codigo TOTP por la sesion',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Codigo incorrecto o reto vencido' })
  async verificarMfa(@Body() dto: VerifyMfaDto): Promise<LoginResponseDto> {
    const sesion = await this.verifyMfa.execute(dto);
    return {
      accessToken: sesion.accessToken,
      refreshToken: sesion.refreshToken,
      usuario: aUsuarioSesion(sesion.usuario),
    };
  }

  @Post('mfa/enrolar')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Audit('ENROLAR_MFA', { entidad: 'usuario', tipo: 'ACTUALIZACION' })
  @ApiOperation({
    summary: 'Genera el secreto TOTP (para el QR). Queda inactivo hasta /mfa/activar',
  })
  @ApiOkResponse({ type: EnrolamientoMfaResponseDto })
  enrolarMfa(@CurrentUser('id') usuarioId: string): Promise<EnrolamientoMfaResponseDto> {
    return this.gestionarMfa.enrolar(usuarioId);
  }

  @Post('mfa/activar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @Audit('ACTIVAR_MFA', { entidad: 'usuario', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Activa el segundo factor confirmando un codigo de la app' })
  async activarMfa(@CurrentUser('id') usuarioId: string, @Body() dto: CodigoMfaDto): Promise<void> {
    await this.gestionarMfa.activar(usuarioId, dto.codigo);
  }

  @Post('mfa/desactivar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @Audit('DESACTIVAR_MFA', { entidad: 'usuario', tipo: 'ACTUALIZACION' })
  @ApiOperation({ summary: 'Desactiva el segundo factor (exige un codigo valido)' })
  async desactivarMfa(
    @CurrentUser('id') usuarioId: string,
    @Body() dto: CodigoMfaDto,
  ): Promise<void> {
    await this.gestionarMfa.desactivar(usuarioId, dto.codigo);
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
