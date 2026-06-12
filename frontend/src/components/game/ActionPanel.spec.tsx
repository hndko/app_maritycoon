import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionPanel } from './ActionPanel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const session = {
  guestId: 'guest-a',
  isHost: true,
  playerId: 'player-a',
  playerName: 'Host A',
  roomCode: 'ROOMA',
  roomId: 'room-a',
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

function buttons(): HTMLButtonElement[] {
  return Array.from(container?.querySelectorAll('button') ?? []);
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

describe('ActionPanel', () => {
  it('enables host start only in a connected waiting room with enough players', () => {
    const onStartGame = vi.fn();
    render(
      <ActionPanel
        isConnected
        onBuildHouse={vi.fn()}
        onBuyProperty={vi.fn()}
        onDeclareBankruptcy={vi.fn()}
        onEndTurn={vi.fn()}
        onMortgageProperty={vi.fn()}
        onRollDice={vi.fn()}
        onStartGame={onStartGame}
        ownedBuildablePropertyId={null}
        ownedMortgageablePropertyId={null}
        pendingAction={null}
        playerCount={2}
        roomProperties={[]}
        session={session}
        status="waiting"
      />,
    );

    buttons()[0].click();
    expect(onStartGame).toHaveBeenCalledTimes(1);
    expect(buttons()[1].disabled).toBe(true);
  });

  it('sends gameplay intents only when the current authoritative state allows them', () => {
    const onRollDice = vi.fn();
    const onBuyProperty = vi.fn();
    const onEndTurn = vi.fn();
    const onBuildHouse = vi.fn();
    const onMortgageProperty = vi.fn();

    render(
      <ActionPanel
        isConnected
        onBuildHouse={onBuildHouse}
        onBuyProperty={onBuyProperty}
        onDeclareBankruptcy={vi.fn()}
        onEndTurn={onEndTurn}
        onMortgageProperty={onMortgageProperty}
        onRollDice={onRollDice}
        onStartGame={vi.fn()}
        ownedBuildablePropertyId={1}
        ownedMortgageablePropertyId={3}
        pendingAction={{
          player_id: 'player-a',
          price: 600000,
          property_id: 1,
          type: 'buy_property',
        }}
        playerCount={2}
        roomProperties={[
          {
            hotel_count: 0,
            house_count: 0,
            is_mortgaged: false,
            owner_id: 'player-a',
            property_id: 3,
          },
        ]}
        session={session}
        status="playing"
        turn={{
          current_player_id: 'player-a',
          double_count: 0,
          phase: 'await_action',
        }}
      />,
    );

    buttons()[2].click();
    buttons()[5].click();

    expect(onRollDice).not.toHaveBeenCalled();
    expect(onBuyProperty).toHaveBeenCalledWith(1);
    expect(onEndTurn).not.toHaveBeenCalled();
    expect(onBuildHouse).not.toHaveBeenCalled();
    expect(onMortgageProperty).toHaveBeenCalledWith(3);
    expect(container?.textContent).toContain('Properti tersedia');
    expect(container?.textContent).toContain('1 properti dimiliki');
  });

  it('enables bankruptcy action only for the debtor pending action', () => {
    const onDeclareBankruptcy = vi.fn();
    render(
      <ActionPanel
        isConnected
        onBuildHouse={vi.fn()}
        onBuyProperty={vi.fn()}
        onDeclareBankruptcy={onDeclareBankruptcy}
        onEndTurn={vi.fn()}
        onMortgageProperty={vi.fn()}
        onRollDice={vi.fn()}
        onStartGame={vi.fn()}
        ownedBuildablePropertyId={null}
        ownedMortgageablePropertyId={null}
        pendingAction={{
          amount: 2000000,
          creditor_id: 'player-b',
          player_id: 'player-a',
          reason: 'rent',
          type: 'bankruptcy_resolution',
        }}
        playerCount={2}
        roomProperties={[]}
        session={session}
        status="playing"
        turn={{
          current_player_id: 'player-a',
          double_count: 0,
          phase: 'bankruptcy_resolution',
        }}
      />,
    );

    buttons()[6].click();
    expect(onDeclareBankruptcy).toHaveBeenCalledTimes(1);
    expect(container?.textContent).toContain('Hutang');
  });
});
