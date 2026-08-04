import { Badge, type BadgeVariant } from '@/components/ui/badge';
import type {
  InventoryUnitStatus,
  WarrantyClaimResolution,
  WarrantyClaimStatus,
  WarrantyRecordType,
  WarrantyStatus,
} from '@/types/inventory';

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
    <Badge variant={WARRANTY_VARIANT[status]} size="sm">
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

const RECORD_TYPE_LABEL: Record<WarrantyRecordType, string> = {
  ITEM: 'Məhsul',
  UNIT: 'Vahid',
};

/** Says whether a warranty row covers a whole batch or one serialized unit. */
export function RecordTypeBadge({ type }: { type: WarrantyRecordType }) {
  return (
    <Badge variant={type === 'UNIT' ? 'gold' : 'outline'} size="sm">
      {RECORD_TYPE_LABEL[type]}
    </Badge>
  );
}

const CLAIM_STATUS_LABEL: Record<WarrantyClaimStatus, string> = {
  SUBMITTED: 'Cavab gözlənilir',
  ACCEPTED: 'Qəbul edilib',
  REJECTED: 'Rədd edilib',
  RESOLVED: 'Bağlanıb',
};

/**
 * Accepted is `ok` and rejected is `danger` on purpose — the colour carries who ends up paying,
 * which is the only thing a person scanning this list actually needs from it.
 */
const CLAIM_STATUS_VARIANT: Record<WarrantyClaimStatus, BadgeVariant> = {
  SUBMITTED: 'warn',
  ACCEPTED: 'ok',
  REJECTED: 'danger',
  RESOLVED: 'info',
};

export function ClaimStatusBadge({ status }: { status: WarrantyClaimStatus }) {
  return (
    <Badge variant={CLAIM_STATUS_VARIANT[status]} size="sm">
      {CLAIM_STATUS_LABEL[status]}
    </Badge>
  );
}

export const CLAIM_RESOLUTION_LABEL: Record<WarrantyClaimResolution, string> = {
  REPLACED: 'Əvəzləndi',
  REPAIRED: 'Təmir edildi',
  REFUNDED: 'Məbləğ qaytarıldı',
  NONE: 'Kompensasiya yoxdur',
};

export { CLAIM_STATUS_LABEL };
