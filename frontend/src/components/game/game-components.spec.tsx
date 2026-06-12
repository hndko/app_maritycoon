import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatBox } from './ChatBox';
import { GameBoard } from './GameBoard';
import { GameLog } from './GameLog';
import { PlayerCard } from './PlayerCard';
import { PlayerList } from './PlayerList';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function changeInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(input, 'value')?.set;
  const prototype = Object.getPrototypeOf(input) as HTMLInputElement;
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(input, value);
  } else {
    valueSetter?.call(input, value);
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

const player = {
  disconnected_at: null,
  id: 'player-a',
  is_bankrupt: false,
  is_connected: true,
  is_host: true,
  is_ready: false,
  joined_at: '2026-01-01T00:00:00.000Z',
  money: 15000000,
  player_name: 'Andi',
  position: 1,
  room_id: 'room-a',
  turn_order: 1,
  user_id: 'guest-a',
};

const properties = Array.from({ length: 40 }, (_, id) => ({
  base_rent: id === 1 ? 20000 : null,
  color_group: id === 1 ? 'Brown' : null,
  house_price: id === 1 ? 500000 : null,
  id,
  mortgage_value: id === 1 ? 300000 : null,
  name: id === 0 ? 'START' : id === 1 ? 'Serang' : `Tile ${id}`,
  price: id === 1 ? 600000 : null,
  rent_1_house: null,
  rent_2_house: null,
  rent_3_house: null,
  rent_4_house: null,
  rent_hotel: null,
  type: id === 0 ? 'start' : id === 1 ? 'city' : 'parking',
}));

const message = {
  message: 'Andi membeli Serang',
  room_id: 'room-a',
  sender_name: 'System',
  timestamp: '2026-01-01T00:00:00.000Z',
  type: 'system' as const,
};

describe('game components', () => {
  it('renders player cards and list states', () => {
    render(<PlayerCard currentTurnPlayerId="player-a" player={player} />);
    expect(container?.textContent).toContain('Andi');
    expect(container?.textContent).toContain('Giliran');
    expect(container?.textContent).toContain('#1');

    act(() => {
      root?.render(
        <PlayerList
          currentTurnPlayerId="player-b"
          players={[
            player,
            {
              ...player,
              id: 'player-b',
              is_bankrupt: true,
              is_connected: false,
              is_host: false,
              player_name: 'Budi',
              position: 3,
              turn_order: 2,
            },
          ]}
        />,
      );
    });

    expect(container?.textContent).toContain('2 pemain di room');
    expect(container?.textContent).toContain('Budi');
    expect(container?.textContent).toContain('Bankrupt');
  });

  it('renders board tiles with player positions and room property state', () => {
    render(
      <GameBoard
        players={[player]}
        properties={properties}
        roomProperties={[
          {
            hotel_count: 0,
            house_count: 1,
            is_mortgaged: false,
            owner_id: 'player-a',
            property_id: 1,
          },
        ]}
      />,
    );

    expect(container?.textContent).toContain('MariTycoon');
    expect(container?.textContent).toContain('Serang');
    expect(container?.querySelector('[title="Andi"]')).not.toBeNull();
  });

  it('submits trimmed chat messages and ignores empty messages', () => {
    const onSend = vi.fn();
    render(<ChatBox disabled={false} messages={[message]} onSend={onSend} />);
    const input = container?.querySelector('input');
    const form = container?.querySelector('form');

    act(() => {
      if (input) {
        changeInputValue(input, '  Halo  ');
      }
    });
    act(() => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onSend).toHaveBeenCalledWith('Halo');

    act(() => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('renders empty and populated game logs', () => {
    render(<GameLog messages={[]} />);
    expect(container?.textContent).toContain('Belum ada event.');

    act(() => {
      root?.render(<GameLog messages={[message]} />);
    });
    expect(container?.textContent).toContain('System: Andi membeli Serang');
  });
});
