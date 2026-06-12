import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { BoardTile } from './BoardTile';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cityTile = {
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

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function render(element: ReactElement): HTMLDivElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(element);
  });
  return container;
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

describe('BoardTile', () => {
  it('renders city price, player tokens, and ownership state', () => {
    render(
      <BoardTile
        players={[
          {
            id: 'player-a',
            is_bankrupt: false,
            is_host: true,
            is_ready: false,
            joined_at: '2026-01-01T00:00:00.000Z',
            money: 15000000,
            player_name: 'Andi',
            position: 1,
            room_id: 'room-a',
            turn_order: 1,
            user_id: 'guest-a',
          },
        ]}
        roomProperty={{
          hotel_count: 0,
          house_count: 2,
          is_mortgaged: false,
          owner_id: 'player-a',
          property_id: 1,
        }}
        tile={cityTile}
      />,
    );

    expect(container?.textContent).toContain('Serang');
    expect(container?.textContent).toMatch(/Rp\s*600\.000/);
    expect(container?.textContent).toContain('Owner play');
    expect(container?.textContent).toContain('H2');
    expect(container?.querySelector('[title="Andi"]')?.textContent).toBe('A');
  });

  it('renders non-buyable and mortgaged states', () => {
    render(
      <BoardTile
        players={[]}
        roomProperty={{
          hotel_count: 1,
          house_count: 0,
          is_mortgaged: true,
          owner_id: 'player-b',
          property_id: 5,
        }}
        tile={{
          ...cityTile,
          color_group: null,
          id: 5,
          name: 'Pelabuhan Merak',
          price: null,
          type: 'station',
        }}
      />,
    );

    expect(container?.textContent).toContain('Pelabuhan Merak');
    expect(container?.textContent).toContain('station');
    expect(container?.textContent).toContain('Mortgaged');
    expect(container?.textContent).toContain('Hotel');
  });
});
