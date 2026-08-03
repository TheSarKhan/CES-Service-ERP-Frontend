'use client';

import { TableWrap } from '@/components/ui/table';
import { ProductSearchPanel } from '@/components/inventory/ProductSearchPanel';

export default function WarehouseSearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Məhsul axtarışı</h1>
        <p className="text-sm text-muted-foreground">
          Ad, SKU, barkod və ya istənilən dinamik sahə dəyəri üzrə bütün məhsullarda axtarış
        </p>
      </div>

      <TableWrap className="p-4">
        <ProductSearchPanel />
      </TableWrap>
    </div>
  );
}
