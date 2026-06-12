import { describe, expect, it } from 'vitest';
import { boardTileSeeds } from './board-seed';

describe('boardTileSeeds', () => {
  it('contains one tile for each board position from 0 through 39', () => {
    const ids = boardTileSeeds.map((tile) => tile.id);

    expect(boardTileSeeds).toHaveLength(40);
    expect(new Set(ids).size).toBe(40);
    expect(Math.min(...ids)).toBe(0);
    expect(Math.max(...ids)).toBe(39);
  });

  it('contains the Indonesian color groups from the design document', () => {
    const colorGroups = new Set(
      boardTileSeeds
        .filter((tile) => tile.type === 'city')
        .map((tile) => tile.colorGroup),
    );

    expect(colorGroups).toEqual(
      new Set([
        'Brown',
        'Light Blue',
        'Pink',
        'Orange',
        'Red',
        'Yellow',
        'Green',
        'Dark Blue',
      ]),
    );
  });

  it('keeps city tiles buyable and non-city event tiles non-buyable', () => {
    const cityTiles = boardTileSeeds.filter((tile) => tile.type === 'city');
    const nonBuyableTiles = boardTileSeeds.filter((tile) =>
      ['tax', 'chance', 'community_chest', 'start', 'jail', 'parking'].includes(
        tile.type,
      ),
    );

    expect(cityTiles).toHaveLength(22);
    expect(
      cityTiles.every(
        (tile) =>
          tile.price !== null &&
          tile.baseRent !== null &&
          tile.housePrice !== null &&
          tile.mortgageValue !== null,
      ),
    ).toBe(true);
    expect(
      nonBuyableTiles.every(
        (tile) =>
          tile.price === null &&
          tile.baseRent === null &&
          tile.housePrice === null &&
          tile.mortgageValue === null,
      ),
    ).toBe(true);
  });
});
