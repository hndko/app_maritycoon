import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const roomCodeLength = 8;

@Injectable()
export class RoomCodeService {
  generate(): string {
    const bytes = randomBytes(roomCodeLength);

    return Array.from(bytes)
      .map((byte) => alphabet[byte % alphabet.length])
      .join('');
  }
}
