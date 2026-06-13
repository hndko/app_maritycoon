import { PendingAction, PropertyTile } from '@/shared/api/types';
import { formatCurrency } from '@/shared/lib/format';
import { Button } from '../ui/Button';

export function PurchaseModal({
  onBuy,
  property,
  pendingAction,
}: {
  onBuy: (propertyId: number) => void;
  property: PropertyTile | null;
  pendingAction: PendingAction;
}) {
  if (!pendingAction || pendingAction.type !== 'buy_property' || !property) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-30 mx-auto max-w-md rounded-md border border-amber-200 bg-white p-4 shadow-xl">
      <p className="text-xs font-semibold uppercase text-secondary">Purchase</p>
      <h2 className="text-lg font-bold">{property.name}</h2>
      <p className="mt-1 text-sm text-slate-600">Properti ini tersedia seharga {formatCurrency(pendingAction.price)}.</p>
      <Button className="mt-3 w-full" onClick={() => onBuy(pendingAction.property_id)}>
        Buy Property
      </Button>
    </div>
  );
}
