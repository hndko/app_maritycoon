import { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './Button';

export function Dropdown({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <details className="relative">
      <summary className="list-none">
        <Button className="h-10 px-3" icon={<ChevronDown className="size-4" />} variant="ghost">
          {label}
        </Button>
      </summary>
      <div className="absolute bottom-full left-0 z-30 mb-2 min-w-48 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
        {children}
      </div>
    </details>
  );
}
