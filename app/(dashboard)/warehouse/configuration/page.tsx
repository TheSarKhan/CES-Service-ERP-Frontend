'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { TableWrap } from '@/components/ui/table';
import { NodeTree } from '@/components/inventory/NodeTree';
import { NodeFormDialog } from '@/components/inventory/NodeFormDialog';
import { CategoryManager } from '@/components/inventory/CategoryManager';

const CONFIG_TABS = [
  { key: 'structure', label: 'Qovluq strukturu' },
  { key: 'categories', label: 'Kateqoriyalar' },
];

export default function WarehouseConfigurationPage() {
  const [configTab, setConfigTab] = useState('structure');
  const [createRootOpen, setCreateRootOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* The create action sits beside the title, the same as every other module. It shows only on
          the structure tab — categories are added from their own panel. */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Anbar Konfiqurasiya</h1>
          <p className="text-sm text-muted-foreground">
            Qovluq strukturu və kateqoriya/dinamik sahə sxemi
          </p>
        </div>
        {configTab === 'structure' && (
          <Button variant="primary" onClick={() => setCreateRootOpen(true)}>
            <Plus className="h-4 w-4" />
            Kök qovluq
          </Button>
        )}
      </div>

      <TableWrap className="p-4">
        <Tabs items={CONFIG_TABS} value={configTab} onChange={setConfigTab} className="mb-4" />
        {configTab === 'structure' && <NodeTree mode="manage" />}
        {configTab === 'categories' && <CategoryManager />}
      </TableWrap>

      <NodeFormDialog open={createRootOpen} onOpenChange={setCreateRootOpen} parentId={null} />
    </div>
  );
}
