import { ReactNode } from 'react';
import { Button } from './Button';

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

export function Tabs({
  activeTab,
  onChange,
  tabs,
}: {
  activeTab: string;
  onChange: (tabId: string) => void;
  tabs: TabItem[];
}) {
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <div>
      <div className="mb-3 flex gap-2 rounded-md bg-slate-100 p-1">
        {tabs.map((tab) => (
          <Button
            className="h-9 flex-1 px-3"
            key={tab.id}
            onClick={() => onChange(tab.id)}
            variant={tab.id === currentTab.id ? 'primary' : 'ghost'}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {currentTab.content}
    </div>
  );
}
