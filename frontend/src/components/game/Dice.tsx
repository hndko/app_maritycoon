import { DiceState } from '@/shared/api/types';
import { Card } from '../ui/Card';

export function Dice({ dice }: { dice: DiceState }) {
  if (!dice) {
    return (
      <Card className="p-4">
        <h2 className="text-lg font-bold">Dice</h2>
        <p className="mt-2 text-sm text-slate-600">Belum ada lemparan.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-bold">Dice</h2>
      <div className="mt-3 flex items-center gap-3">
        <Die value={dice.dice_1} />
        <Die value={dice.dice_2} />
        <span className="text-sm font-semibold text-slate-600">= {dice.total}</span>
      </div>
      {dice.is_double ? <p className="mt-2 text-xs font-semibold text-secondary">Double, giliran ekstra.</p> : null}
    </Card>
  );
}

function Die({ value }: { value: number }) {
  return (
    <span className="grid size-12 place-items-center rounded-md border border-slate-200 bg-white text-xl font-bold text-slate-950 shadow-sm">
      {value}
    </span>
  );
}
