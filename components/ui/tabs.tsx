'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  key: string;
  label: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

/** Row-style tab switcher (kit `.tabs` / `.tb`). Purely presentational — panels render outside. */
function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('tabs', className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={value === item.key}
          className={cn('tb', value === item.key && 'on')}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export { Tabs };
