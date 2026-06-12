import { describe, expect, it } from 'vitest';
import { getBoardTrack } from './board';

describe('board helpers', () => {
  it('places Monopoly corner tiles on an 11 by 11 board track', () => {
    expect(getBoardTrack(0)).toEqual({ gridColumn: 11, gridRow: 11 });
    expect(getBoardTrack(10)).toEqual({ gridColumn: 1, gridRow: 11 });
    expect(getBoardTrack(20)).toEqual({ gridColumn: 1, gridRow: 1 });
    expect(getBoardTrack(30)).toEqual({ gridColumn: 11, gridRow: 1 });
  });

  it('rejects invalid board indexes', () => {
    expect(() => getBoardTrack(40)).toThrow('Board index must be between 0 and 39');
  });
});
