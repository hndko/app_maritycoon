import { describe, expect, it } from 'vitest';
import { RoomCodeService } from './room-code.service';

describe('RoomCodeService', () => {
  it('generates an eight-character room code without ambiguous characters', () => {
    const service = new RoomCodeService();
    const code = service.generate();

    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    expect(code).not.toMatch(/[IO01]/);
  });
});
