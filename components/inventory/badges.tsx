import { Badge, type BadgeVariant } from '@/components/ui/badge';
import type { InventoryUnitStatus, WarrantyStatus } from '@/types/inventory';

const WARRANTY_LABEL: Record<WarrantyStatus, string> = {
  NONE: 'Zəmanətsiz',
  ACTIVE: 'Zəmanətli',
  EXPIRING_SOON: 'Bitməkdə',
  EXPIRED: 'Bitib',
};

const WARRANTY_VARIANT: Record<WarrantyStatus, BadgeVariant> = {
  NONE: 'mute',
  ACTIVE: 'ok',
  EXPIRING_SOON: 'warn',
  EXPIRED: 'danger',
};

export function WarrantyStatusBadge({ status }: { status: WarrantyStatus }) {
  return (
    <Badge variant={WARRANTY_VARIANT[status]} size="sm" dot>
      {WARRANTY_LABEL[status]}
    </Badge>
  );
}

const UNIT_STATUS_LABEL: Record<InventoryUnitStatus, string> = {
  IN_STOCK: 'Stokda',
  IN_USE: 'İstifadədə',
  FAILED: 'Sıradan çıxıb',
  DISPOSED: 'Silinib',
  RETURNED: 'Qaytarılıb',
};

const UNIT_STATUS_VARIANT: Record<InventoryUnitStatus, BadgeVariant> = {
  IN_STOCK: 'ok',
  IN_USE: 'info',
  FAILED: 'danger',
  DISPOSED: 'mute',
  RETURNED: 'warn',
};

export function UnitStatusBadge({ status }: { status: InventoryUnitStatus }) {
  return (
    <Badge variant={UNIT_STATUS_VARIANT[status]} size="sm">
      {UNIT_STATUS_LABEL[status]}
    </Badge>
  );
}
