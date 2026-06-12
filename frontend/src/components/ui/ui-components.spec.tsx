import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { LoadingSpinner } from './LoadingSpinner';
import { Select } from './Select';

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

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

describe('ui components', () => {
  it('renders badge, button, card, and loading spinner with expected content', () => {
    render(
      <Card className="custom-card">
        <Badge tone="green">Online</Badge>
        <Button className="custom-button" variant="danger">
          Delete
        </Button>
        <LoadingSpinner />
      </Card>,
    );

    expect(container?.textContent).toContain('Online');
    expect(container?.textContent).toContain('Delete');
    expect(container?.querySelector('.custom-card')).not.toBeNull();
    expect(container?.querySelector('.custom-button')).not.toBeNull();
    expect(container?.querySelector('.animate-spin')).not.toBeNull();
  });

  it('renders labeled input and select controls', () => {
    render(
      <form>
        <Input label="Nama" name="player_name" placeholder="Andi" />
        <Select label="Visibility" name="visibility" defaultValue="public">
          <option value="public">Public</option>
          <option value="private">Private</option>
        </Select>
      </form>,
    );

    expect(container?.textContent).toContain('Nama');
    expect(container?.textContent).toContain('Visibility');
    expect(container?.querySelector('input')?.getAttribute('placeholder')).toBe('Andi');
    expect(container?.querySelector('select')?.value).toBe('public');
  });
});
