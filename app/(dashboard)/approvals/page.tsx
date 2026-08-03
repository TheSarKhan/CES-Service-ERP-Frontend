'use client';

import { TableWrap } from '@/components/ui/table';
import { ApprovalPanel } from '@/components/approval/ApprovalPanel';

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Təsdiqləmələr</h1>
        <p className="text-sm text-muted-foreground">
          Anbar dəyişikliklərinin paralel təsdiq növbəsi
        </p>
      </div>

      <TableWrap className="p-4">
        <ApprovalPanel />
      </TableWrap>
    </div>
  );
}
