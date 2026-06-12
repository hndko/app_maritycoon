import { describe, expect, it, vi } from 'vitest';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';

describe('GameService', () => {
  it('returns board properties from repository', async () => {
    const property = {
      base_rent: 20000,
      color_group: 'Brown',
      house_price: 500000,
      id: 1,
      mortgage_value: 300000,
      name: 'Serang',
      price: 600000,
      rent_1_house: 100000,
      rent_2_house: 300000,
      rent_3_house: 900000,
      rent_4_house: 1600000,
      rent_hotel: 2500000,
      type: 'city',
    };
    const repository = {
      listProperties: vi.fn(async () => [property]),
    };
    const service = new GameService(repository as unknown as GameRepository);

    await expect(service.listProperties()).resolves.toEqual([property]);
    expect(repository.listProperties).toHaveBeenCalledTimes(1);
  });
});
