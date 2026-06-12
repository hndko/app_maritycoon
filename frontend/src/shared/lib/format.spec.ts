import { describe, expect, it } from 'vitest';
import { formatCurrency, formatRoomStatus } from './format';

describe('format helpers', () => {
  it('formats Indonesian Rupiah without cents', () => {
    expect(formatCurrency(15000000)).toContain('15.000.000');
  });

  it('maps room statuses to Indonesian labels', () => {
    expect(formatRoomStatus('waiting')).toBe('Menunggu');
    expect(formatRoomStatus('playing')).toBe('Berlangsung');
  });
});
