'use client';

import { TableWrap } from '@/components/ui/table';
import { WarrantySearchPanel } from '@/components/inventory/WarrantySearchPanel';

export default function WarehouseWarrantyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Zəmanət axtarışı</h1>
        <p className="text-sm text-muted-foreground">
          Seriya nömrəli vahidləri zəmanət statusuna görə axtarın
        </p>
      </div>

      <TableWrap className="p-4">
        <WarrantySearchPanel />
      </TableWrap>
    </div>
  );
}
