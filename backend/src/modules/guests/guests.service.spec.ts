import { describe, expect, it, vi } from 'vitest';
import { GuestsRepository } from './guests.repository';
import { GuestsService } from './guests.service';

describe('GuestsService', () => {
  it('creates a trimmed guest profile', async () => {
    const repository = {
      create: vi.fn(async (nickname: string) => ({
        id: 'guest-1',
        nickname,
        created_at: new Date(),
      })),
    } as unknown as GuestsRepository;
    const service = new GuestsService(repository);

    await expect(service.createGuest(' Budi ')).resolves.toEqual({
      guest_id: 'guest-1',
      nickname: 'Budi',
    });
    expect(repository.create).toHaveBeenCalledWith('Budi');
  });
});
