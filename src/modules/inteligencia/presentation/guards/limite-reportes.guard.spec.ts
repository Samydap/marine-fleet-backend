import type { ExecutionContext, HttpException } from '@nestjs/common';
import { LimiteReportesGuard } from './limite-reportes.guard';

const contexto = (ip: string): ExecutionContext =>
  ({ switchToHttp: () => ({ getRequest: () => ({ ip }) }) }) as unknown as ExecutionContext;

describe('LimiteReportesGuard', () => {
  it('deja pasar 5 reportes por minuto por IP y bloquea el sexto con 429', () => {
    const guard = new LimiteReportesGuard();
    for (let i = 0; i < 5; i += 1) expect(guard.canActivate(contexto('1.1.1.1'))).toBe(true);

    const error = ((): HttpException | null => {
      try {
        guard.canActivate(contexto('1.1.1.1'));
        return null;
      } catch (e) {
        return e as HttpException;
      }
    })();

    expect(error?.getStatus()).toBe(429);
    expect(guard.canActivate(contexto('2.2.2.2'))).toBe(true);
  });
});
