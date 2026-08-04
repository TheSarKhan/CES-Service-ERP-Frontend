'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import {
  useApprovals,
  useApproveRequest,
  useCancelRequest,
  useRejectRequest,
} from '@/hooks/use-approvals';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import { Textarea } from '@/components/ui/textarea';
import { Label, Field } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useInventoryNode } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type {
  ApprovalEntityType,
  ApprovalOperation,
  ApprovalRequest,
  ApprovalStatus,
} from '@/types/approval';

const PAGE_SIZE = 20;

const STATUS_TABS: { key: ApprovalStatus | 'ALL'; label: string }[] = [
  { key: 'PENDING', label: 'Gözləyən' },
  { key: 'APPROVED', label: 'Təsdiqlənmiş' },
  { key: 'REJECTED', label: 'İmtina edilmiş' },
  { key: 'ALL', label: 'Hamısı' },
];

const OPERATION_LABELS: Record<ApprovalOperation, string> = {
  UPDATE: 'Redaktə',
  DELETE: 'Silmə',
  MOVE: 'Köçürmə',
  STOCK_IN: 'Stok girişi',
  STOCK_OUT: 'Stok çıxışı',
  STOCK_ADJUST: 'Sayım düzəlişi',
  FIELD_ADD: 'Sahə əlavəsi',
  FIELD_UPDATE: 'Sahə redaktəsi',
  FIELD_DELETE: 'Sahə silinməsi',
  WARRANTY_EXTEND: 'Zəmanət uzadılması',
  STOCKTAKE_APPLY: 'İnventarizasiya fərqləri',
};

const ENTITY_LABELS: Record<ApprovalEntityType, string> = {
  INVENTORY_ITEM: 'Məhsul',
  INVENTORY_ITEM_UNIT: 'Seriyalı vahid',
  INVENTORY_NODE: 'Qovluq',
  INVENTORY_CATEGORY: 'Kateqoriya',
  INVENTORY_STOCKTAKE: 'İnventarizasiya',
};

const STATUS_META: Record<ApprovalStatus, { label: string; variant: 'warn' | 'ok' | 'danger' | 'mute' }> = {
  PENDING: { label: 'Gözləyir', variant: 'warn' },
  APPROVED: { label: 'Təsdiqlənib', variant: 'ok' },
  REJECTED: { label: 'İmtina edilib', variant: 'danger' },
  CANCELLED: { label: 'Geri götürülüb', variant: 'mute' },
};

/** Fields that carry no meaning for a reviewer — ids, audit columns, internal codes. */
const HIDDEN_DIFF_KEYS = new Set([
  'id',
  'branchId',
  'qrCode',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'createdBy',
  'updatedBy',
  'hasChildren',
  // Stock is shown by the dedicated block, and a raw array of rows in a diff cell is unreadable.
  'locations',
]);

/**
 * Fields the backend leaves untouched when the payload sends null (`if (x != null) set(x)`).
 * Without this they'd render as "Bəli → —" and read like the reviewer is being asked to
 * deactivate the record. Fields where null genuinely means "clear it" (notes) are not listed.
 */
const NULL_MEANS_UNCHANGED = new Set(['isActive', 'isSerialized']);

const FIELD_LABELS: Record<string, string> = {
  name: 'Ad',
  sku: 'SKU',
  barcode: 'Barkod',
  unit: 'Ölçü vahidi',
  quantity: 'Miqdar',
  totalQuantity: 'Cəmi miqdar',
  supplier: 'Təchizatçı',
  fromNodeId: 'Mənbə qovluq',
  toNodeId: 'Təyinat qovluq',
  purchasePrice: 'Alış qiyməti',
  isSerialized: 'Seriyalı',
  isActive: 'Aktiv',
  notes: 'Qeyd',
  attributes: 'Dinamik sahələr',
  nodeId: 'Qovluq',
  categoryId: 'Kateqoriya',
  parentId: 'Üst qovluq',
  code: 'Kod',
  categoryIds: 'İcazəli kateqoriyalar',
  defaultUnit: 'Ölçü vahidi',
  label: 'Görünən ad',
  fieldKey: 'Sahə açarı',
  fieldType: 'Tip',
  isRequired: 'Məcburi',
  showInTable: 'Cədvəldə göstər',
  reason: 'Səbəb',
  field: 'Sahə',
  fieldId: 'Sahə ID',
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Bəli' : 'Xeyr';
  if (Array.isArray(value)) return value.length === 0 ? '—' : value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

/** Trims the trailing zeros Postgres numeric(12,3) brings along: `215.000` reads as noise. */
function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function toNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

const STOCK_OPERATIONS = new Set<ApprovalOperation>(['STOCK_IN', 'STOCK_OUT', 'STOCK_ADJUST']);

/** The snapshot's stock rows, when it has any. */
function locationsOf(before: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(before.locations) ? (before.locations as Record<string, unknown>[]) : [];
}

/**
 * Stock before the operation — at the folder the request targets, not across the warehouse. A
 * product held in three places has three balances, and only one of them is about to move.
 *
 * Falls back to the old snapshot shape so requests parked before products became multi-location
 * still render instead of silently dropping to the generic diff.
 */
function balanceAtTargetNode(
  before: Record<string, unknown>,
  payload: Record<string, unknown>,
): number | null {
  const nodeId = payload.nodeId;
  if (typeof nodeId === 'string') {
    const match = locationsOf(before).find((location) => location.nodeId === nodeId);
    // No row yet means the product has never been kept there — zero, not unknown.
    return match ? toNumber(match.quantity) : 0;
  }
  return toNumber(before.quantity);
}

function targetFolderName(
  before: Record<string, unknown>,
  payload: Record<string, unknown>,
): string | null {
  const nodeId = payload.nodeId;
  if (typeof nodeId !== 'string') return null;
  const match = locationsOf(before).find((location) => location.nodeId === nodeId);
  return typeof match?.nodeName === 'string' ? match.nodeName : null;
}

/**
 * Stock quantity after the operation is applied — mirrors `InventoryItemService`: stock-in adds,
 * stock-out subtracts, a count correction replaces. Safe to compute here because a pending
 * request locks the item, so the snapshotted quantity cannot move underneath it.
 */
function resultingQuantity(operation: ApprovalOperation, before: number, amount: number): number {
  if (operation === 'STOCK_ADJUST') return amount;
  return operation === 'STOCK_IN' ? before + amount : before - amount;
}

/**
 * Stock operations get their own block rather than the generic before/after diff.
 *
 * The payload carries a *delta*, so the generic diff put "50" in the "Sonra" column and made a
 * 50-unit intake read as "stock drops to 50" — and a 50-unit withdrawal rendered identically.
 * The reviewer is approving a resulting number, so that is what has to be on screen.
 */
function StockDiff({ request }: { request: ApprovalRequest }) {
  const before = (request.beforeSnapshot ?? {}) as Record<string, unknown>;
  const payload = (request.payload ?? {}) as Record<string, unknown>;
  const snapshotName = targetFolderName(before, payload);

  // Bringing goods into a folder the product has never been kept in is the one case the snapshot
  // cannot name — there is no stock row for it yet — so the folder is fetched by id.
  const { data: targetNode } = useInventoryNode(
    !snapshotName && typeof payload.nodeId === 'string' ? payload.nodeId : null,
  );

  const currentQuantity = balanceAtTargetNode(before, payload);
  const amount = toNumber(payload.quantity);
  if (currentQuantity === null || amount === null) return null;

  const unit = typeof before.unit === 'string' ? before.unit : '';
  const folderName = snapshotName ?? targetNode?.name ?? null;
  const result = resultingQuantity(request.operation, currentQuantity, amount);
  const isAdjust = request.operation === 'STOCK_ADJUST';
  const sign = request.operation === 'STOCK_IN' ? '+' : '−';
  const changeLabel = isAdjust ? 'Yeni sayım' : request.operation === 'STOCK_IN' ? 'Giriş' : 'Çıxış';
  const reason = typeof payload.reason === 'string' ? payload.reason : '';

  return (
    <div>
      {/* Which shelf, spelled out: the same product can sit in several, and approving "+50" without
          knowing where would be approving a number, not a movement. */}
      {folderName && (
        <div className="mb-3 rounded-lg border border-line p-3 text-sm">
          <span className="text-xs text-muted-foreground">Qovluq: </span>
          <span className="font-semibold">{folderName}</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 rounded-lg border border-line p-3 text-center">
        <div>
          <div className="text-xs text-muted-foreground">Hazırkı qalıq</div>
          <div className="mt-0.5 text-lg font-bold">
            {formatQuantity(currentQuantity)} <span className="text-sm font-normal">{unit}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{changeLabel}</div>
          <div className="mt-0.5 text-lg font-bold text-gold">
            {isAdjust ? '' : sign}
            {formatQuantity(amount)} <span className="text-sm font-normal">{unit}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Təsdiqdən sonra</div>
          <div className={cn('mt-0.5 text-lg font-extrabold', result < 0 && 'text-danger')}>
            {formatQuantity(result)} <span className="text-sm font-normal">{unit}</span>
          </div>
        </div>
      </div>

      {result < 0 && (
        <div className="mt-3">
          <Alert variant="danger" title="Qalıq çatmır">
            {folderName ? `«${folderName}» qovluğunda` : 'Anbarda'} yalnız{' '}
            {formatQuantity(currentQuantity)} {unit} var — bu sorğu təsdiqlənə bilməz.
          </Alert>
        </div>
      )}

      {reason && (
        <div className="mt-3 rounded-lg border border-line p-3">
          <div className="text-xs text-muted-foreground">Səbəb</div>
          <div className="mt-0.5 text-sm">{reason}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Relocations get their own block too.
 *
 * The generic diff can only print two folder ids, and an omitted amount — which means "all of it" —
 * renders there as "—", reading like nothing is being moved at all. The reviewer is approving stock
 * leaving a specific shelf, so the shelf, the amount and what stays behind are what has to be on
 * screen.
 */
function MoveDiff({ request }: { request: ApprovalRequest }) {
  const before = (request.beforeSnapshot ?? {}) as Record<string, unknown>;
  const payload = (request.payload ?? {}) as Record<string, unknown>;
  const fromId = typeof payload.fromNodeId === 'string' ? payload.fromNodeId : null;
  const toId = typeof payload.toNodeId === 'string' ? payload.toNodeId : null;

  const rows = locationsOf(before);
  const sourceRow = rows.find((location) => location.nodeId === fromId);
  const targetRow = rows.find((location) => location.nodeId === toId);

  // The destination is usually a folder the product has never been kept in, so it has no stock row
  // to carry a name — that is the one worth fetching by id.
  const { data: sourceNode } = useInventoryNode(!sourceRow && fromId ? fromId : null);
  const { data: targetNode } = useInventoryNode(!targetRow && toId ? toId : null);

  const available = (sourceRow ? toNumber(sourceRow.quantity) : null) ?? 0;
  // An absent amount is the whole balance, not zero.
  const requested = toNumber(payload.quantity);
  const moving = requested ?? available;
  const remaining = available - moving;

  const unit = typeof before.unit === 'string' ? before.unit : '';
  const sourceName =
    (typeof sourceRow?.nodeName === 'string' ? sourceRow.nodeName : null) ?? sourceNode?.name ?? '—';
  const targetName =
    (typeof targetRow?.nodeName === 'string' ? targetRow.nodeName : null) ?? targetNode?.name ?? '—';

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line p-3 text-sm">
        <span className="font-semibold">{sourceName}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">{targetName}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-lg border border-line p-3 text-center">
        <div>
          <div className="text-xs text-muted-foreground">Mənbədə indi</div>
          <div className="mt-0.5 text-lg font-bold">
            {formatQuantity(available)} <span className="text-sm font-normal">{unit}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Köçürülür</div>
          <div className="mt-0.5 text-lg font-bold text-gold">
            {formatQuantity(moving)} <span className="text-sm font-normal">{unit}</span>
          </div>
          {requested === null && <div className="text-xs text-muted-foreground">hamısı</div>}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Mənbədə qalacaq</div>
          <div className={cn('mt-0.5 text-lg font-extrabold', remaining < 0 && 'text-danger')}>
            {formatQuantity(remaining)} <span className="text-sm font-normal">{unit}</span>
          </div>
        </div>
      </div>

      {remaining < 0 && (
        <div className="mt-3">
          <Alert variant="danger" title="Qalıq çatmır">
            «{sourceName}» qovluğunda yalnız {formatQuantity(available)} {unit} var — bu sorğu
            təsdiqlənə bilməz.
          </Alert>
        </div>
      )}
    </div>
  );
}

/**
 * Field-by-field comparison of the stored "before" snapshot against the parked payload.
 *
 * Only keys present in the payload are compared: the payload is the change being requested, so a
 * key it doesn't mention isn't being altered. For DELETE there is no payload at all — the whole
 * snapshot is shown instead, since the reviewer is approving the loss of exactly that record.
 */
function ApprovalDiff({ request }: { request: ApprovalRequest }) {
  const before = (request.beforeSnapshot ?? {}) as Record<string, unknown>;
  const payload = (request.payload ?? {}) as Record<string, unknown>;
  const isDelete = request.operation === 'DELETE';

  // Falls through to the generic diff if either number is missing, so an odd snapshot still shows
  // the reviewer something rather than nothing.
  if (
    STOCK_OPERATIONS.has(request.operation) &&
    balanceAtTargetNode(before, payload) !== null &&
    toNumber(payload.quantity) !== null
  ) {
    return <StockDiff request={request} />;
  }

  if (request.operation === 'MOVE' && typeof payload.fromNodeId === 'string') {
    return <MoveDiff request={request} />;
  }

  if (isDelete) {
    const rows = Object.entries(before).filter(([key]) => !HIDDEN_DIFF_KEYS.has(key));
    return (
      <div>
        <Alert variant="danger" title="Bu qeyd silinəcək">
          Təsdiqlənsə, aşağıdakı qeyd silinir. Bu əməliyyat geri qaytarılmır.
        </Alert>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="tbl w-full">
            <thead>
              <tr>
                <th>Sahə</th>
                <th>Dəyər</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([key, value]) => (
                <tr key={key}>
                  <td className="text-muted-foreground">{labelFor(key)}</td>
                  <td className="font-semibold">{displayValue(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const rows = Object.entries(payload).filter(
    ([key, value]) =>
      !HIDDEN_DIFF_KEYS.has(key) && !(NULL_MEANS_UNCHANGED.has(key) && value === null),
  );
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Bu sorğuda göstəriləcək dəyişiklik yoxdur.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="tbl w-full">
        <thead>
          <tr>
            <th>Sahə</th>
            <th>Əvvəl</th>
            <th>Sonra</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, value]) => {
            const oldText = displayValue(before[key]);
            const newText = displayValue(value);
            const changed = oldText !== newText;
            return (
              <tr key={key} className={cn(!changed && 'opacity-50')}>
                <td className="text-muted-foreground">{labelFor(key)}</td>
                <td>{oldText}</td>
                <td className={cn(changed && 'font-semibold text-gold')}>{newText}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Detail + decision dialog for a single request. */
function ApprovalDetailDialog({
  request,
  open,
  onOpenChange,
}: {
  request: ApprovalRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const cancel = useCancelRequest();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  if (!request) return null;

  const isOwnRequest = Boolean(request.requestedBy) && request.requestedBy === currentUserId;
  const canDecide = hasPermission('APPROVAL_DECIDE') && !isOwnRequest && request.status === 'PENDING';

  async function run(action: 'approve' | 'reject' | 'cancel') {
    setError(null);
    try {
      if (action === 'approve') await approve.mutateAsync({ id: request!.id, note: note || undefined });
      else if (action === 'reject') await reject.mutateAsync({ id: request!.id, note: note || undefined });
      else await cancel.mutateAsync(request!.id);
      setNote('');
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'APPROVAL_SELF_DECISION') {
        setError('Öz sorğunuzu təsdiqləyə bilməzsiniz — ikinci səlahiyyətli şəxs təsdiqləməlidir.');
      } else if (err instanceof ApiRequestError && err.code === 'APPROVAL_ALREADY_DECIDED') {
        setError('Bu sorğu artıq qərara alınıb.');
      } else {
        setError('Əməliyyat alınmadı.');
      }
    }
  }

  const statusMeta = STATUS_META[request.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {OPERATION_LABELS[request.operation]} — {request.entityLabel ?? '—'}
          </DialogTitle>
          <DialogDescription>
            {ENTITY_LABELS[request.entityType]} · {request.requestedByName ?? '—'} ·{' '}
            {formatDateTime(request.requestedAt)}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-3">
            <Alert variant="danger" title="Xəta">
              {error}
            </Alert>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={statusMeta.variant} size="sm">
            {statusMeta.label}
          </Badge>
          {isOwnRequest && request.status === 'PENDING' && (
            <span className="text-xs text-muted-foreground">
              Bu sizin sorğunuzdur — təsdiqi başqa səlahiyyətli şəxs verməlidir.
            </span>
          )}
        </div>

        <ApprovalDiff request={request} />

        {request.status !== 'PENDING' && (
          <div className="mt-4 rounded-lg border border-line p-3 text-sm">
            <div className="text-xs text-muted-foreground">Qərar</div>
            <div className="mt-0.5 font-semibold">
              {request.decidedByName ?? '—'} · {formatDateTime(request.decidedAt)}
            </div>
            {request.decisionNote && <div className="mt-1">{request.decisionNote}</div>}
          </div>
        )}

        {request.status === 'PENDING' && (canDecide || isOwnRequest) && (
          <Field className="mt-4">
            <Label htmlFor="approval-note">Qeyd (opsional)</Label>
            <Textarea
              id="approval-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Qərarın səbəbi..."
            />
          </Field>
        )}

        <DialogFooter className="flex-wrap">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Bağla
          </Button>
          {request.status === 'PENDING' && isOwnRequest && (
            <Button type="button" variant="outline" loading={cancel.isPending} onClick={() => run('cancel')}>
              Sorğunu geri götür
            </Button>
          )}
          {canDecide && (
            <>
              <Button type="button" variant="danger" loading={reject.isPending} onClick={() => run('reject')}>
                <XCircle className="h-4 w-4" />
                İmtina et
              </Button>
              <Button type="button" variant="primary" loading={approve.isPending} onClick={() => run('approve')}>
                <CheckCircle2 className="h-4 w-4" />
                Təsdiqlə
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Təsdiqləmələr — queue of warehouse changes waiting on a second pair of eyes. */
export function ApprovalPanel() {
  const [tab, setTab] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);

  const { data, isLoading, isError } = useApprovals({
    status: tab === 'ALL' ? undefined : tab,
    page,
    size: PAGE_SIZE,
  });
  const requests = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-bold">Təsdiqləmələr</h3>
        <p className="text-sm text-muted-foreground">
          Anbarda edilən dəyişikliklər dərhal tətbiq olunmur — burada ikinci səlahiyyətli şəxs
          təsdiqlədikdən sonra icra edilir.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              setPage(1);
            }}
            className={cn(
              'rounded-full border border-line px-3 py-1.5 text-sm font-semibold transition-colors',
              tab === item.key ? 'border-gold bg-gold-50 text-gold' : 'hover:bg-graphite-50',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isError && (
        <Alert variant="danger" title="Yüklənmədi">
          Təsdiq sorğuları yüklənə bilmədi.
        </Alert>
      )}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}
      {!isLoading && !isError && requests.length === 0 && (
        <Empty
          title="Sorğu yoxdur"
          description={
            tab === 'PENDING'
              ? 'Təsdiq gözləyən dəyişiklik yoxdur.'
              : 'Bu statusda sorğu tapılmadı.'
          }
          icon={<ShieldCheck className="mx-auto h-12 w-12" />}
        />
      )}
      {!isLoading && !isError && requests.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="tbl w-full">
            <thead>
              <tr>
                <th>Obyekt</th>
                <th>Növ</th>
                <th>Əməliyyat</th>
                <th>Sorğunu açan</th>
                <th>Tarix</th>
                <th>Status</th>
                <th className="r">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const statusMeta = STATUS_META[request.status];
                return (
                  <tr
                    key={request.id}
                    onClick={() => setSelected(request)}
                    className="cursor-pointer"
                  >
                    <td className="font-semibold">{request.entityLabel ?? '—'}</td>
                    <td>{ENTITY_LABELS[request.entityType]}</td>
                    <td>{OPERATION_LABELS[request.operation]}</td>
                    <td className="text-muted-foreground">{request.requestedByName ?? '—'}</td>
                    <td>{formatDateTime(request.requestedAt)}</td>
                    <td>
                      <Badge variant={statusMeta.variant} size="sm">
                        {statusMeta.label}
                      </Badge>
                    </td>
                    <td className="r">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(request);
                        }}
                      >
                        Bax
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && meta && meta.total_items > 0 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={meta.total_pages}
            totalItems={meta.total_items}
            pageSize={meta.size || PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      <ApprovalDetailDialog
        request={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
