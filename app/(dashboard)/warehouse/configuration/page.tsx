'use client';

import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { TableWrap } from '@/components/ui/table';
import { NodeTree } from '@/components/inventory/NodeTree';
import { CategoryManager } from '@/components/inventory/CategoryManager';

const CONFIG_TABS = [
  { key: 'structure', label: 'Qovluq strukturu' },
  { key: 'categories', label: 'Kateqoriyalar' },
];

export default function WarehouseConfigurationPage() {
  const [configTab, setConfigTab] = useState('structure');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Anbar Konfiqurasiya</h1>
        <p className="text-sm text-muted-foreground">
          Qovluq strukturu və kateqoriya/dinamik sahə sxemi
        </p>
      </div>

      <TableWrap className="p-4">
        <Tabs items={CONFIG_TABS} value={configTab} onChange={setConfigTab} className="mb-4" />
        {configTab === 'structure' && <NodeTree mode="manage" />}
        {configTab === 'categories' && <CategoryManager />}
      </TableWrap>
    </div>
  );
}
