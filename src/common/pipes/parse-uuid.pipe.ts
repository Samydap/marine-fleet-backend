import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

const ID_VALIDO = /^[A-Za-z0-9-]{1,36}$/;

/**
 * Valida identificadores. El esquema usa VARCHAR(36) con UUID para los
 * registros nuevos pero tambien ids legibles sembrados a mano (`c-luffy`),
 * asi que no se puede usar ParseUUIDPipe tal cual.
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !ID_VALIDO.test(value)) {
      throw new BadRequestException('El identificador no tiene un formato valido.');
    }
    return value;
  }
}
