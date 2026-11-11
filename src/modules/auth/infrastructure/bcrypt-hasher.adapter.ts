import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { PasswordHasherPort } from '../domain/password-hasher.port';

@Injectable()
export class BcryptHasherAdapter implements PasswordHasherPort {
  private readonly rounds: number;

  constructor(private readonly config: ConfigService) {
    this.rounds = this.config.get<number>('jwt.bcryptRounds') ?? 10;
  }

  hash(plano: string): Promise<string> {
    return bcrypt.hash(plano, this.rounds);
  }

  comparar(plano: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plano, hash);
  }
}
