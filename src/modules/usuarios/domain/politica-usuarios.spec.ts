import { DomainError } from '../../../shared/domain/errors/domain.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { Permiso } from '../../../shared/domain/rbac/permiso.enum';
import { RolCodigo } from '../../../shared/domain/rbac/rol.enum';
import {
  asegurarNoEsAutoGestion,
  asegurarPuedeGestionarRol,
  validarBaseSegunRol,
  validarPoliticaContrasena,
} from './politica-usuarios';

describe('politica de usuarios', () => {
  it('acepta una contraseña que cumple la politica', () => {
    expect(() => validarPoliticaContrasena('Marina.2026')).not.toThrow();
  });

  it.each(['corta1A', 'sinmayuscula1', 'SINMINUSCULA1', 'SinNumeros'])(
    'rechaza la contraseña debil "%s"',
    (clave) => {
      expect(() => validarPoliticaContrasena(clave)).toThrow(DomainError);
    },
  );

  it('exige base naval al rol de Capitan', () => {
    expect(() => validarBaseSegunRol(RolCodigo.CAPITAN, null)).toThrow(DomainError);
    expect(() => validarBaseSegunRol(RolCodigo.CAPITAN, 'b-153')).not.toThrow();
    expect(() => validarBaseSegunRol(RolCodigo.ALMIRANTE, null)).not.toThrow();
  });

  it('solo el permiso total gestiona cuentas de Almirante', () => {
    expect(() =>
      asegurarPuedeGestionarRol([Permiso.USUARIOS_ADMINISTRAR], RolCodigo.ALMIRANTE),
    ).toThrow(ForbiddenError);
    expect(() => asegurarPuedeGestionarRol([Permiso.TODO], RolCodigo.ALMIRANTE)).not.toThrow();
    expect(() =>
      asegurarPuedeGestionarRol([Permiso.USUARIOS_ADMINISTRAR], RolCodigo.CAPITAN),
    ).not.toThrow();
  });

  it('impide que alguien cambie su propio rol o estado', () => {
    expect(() => asegurarNoEsAutoGestion('u-1', 'u-1')).toThrow(DomainError);
    expect(() => asegurarNoEsAutoGestion('u-1', 'u-2')).not.toThrow();
  });
});
