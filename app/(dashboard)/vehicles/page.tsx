'use client';

import { useState } from 'react';
import { Search, Truck, Plus } from 'lucide-react';
import { useVehicles } from '@/hooks/use-vehicles';
import type { GarageType, VehicleStatus } from '@/types/vehicle';
import {
  TableWrap,
  TableTools,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Empty } from '@/components/ui/empty';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 6;

const GARAGE_TYPE_LABEL: Record<GarageType, string> = {
  COMPANY: 'Şirkət',
  INVESTOR: 'İnvestor',
  CUSTOMER: 'Müştəri',
};

const STATUS_LABEL: Record<VehicleStatus, string> = {
  ACTIVE: 'Aktiv',
  IN_SERVICE: 'Servisdə',
  INACTIVE: 'Qeyri-aktiv',
};

const STATUS_VARIANT: Record<VehicleStatus, BadgeVariant> = {
  ACTIVE: 'ok',
  IN_SERVICE: 'warn',
  INACTIVE: 'mute',
};

export default function VehiclesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useVehicles({
    page,
    size: PAGE_SIZE,
    sort: 'created_at',
    dir: 'desc',
    search: search || undefined,
  });

  const vehicles = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Qaraj (Texnika)
          </h1>
          <p className="text-sm text-muted-foreground">
            Şirkət, investor və müştəri texnikalarının siyahısı
          </p>
        </div>
        <Button variant="primary" size="sm">
          <Plus className="h-4 w-4" />
          Yeni texnika
        </Button>
      </div>

      {isError && (
        <Alert variant="danger" title="Məlumat yüklənmədi">
          {error instanceof Error
            ? error.message
            : 'Serverlə əlaqə qurulmadı.'}
        </Alert>
      )}

      <TableWrap>
        <TableTools>
          <div className="tt-left">
            <h3>Texnika siyahısı</h3>
            <span className="muted">
              {meta ? `Cəmi ${meta.total_items} texnika` : 'Yüklənir...'}
            </span>
          </div>
          <div className="tt-right">
            <Input
              inputSize="sm"
              placeholder="Axtarış (marka, model, şassi)"
              icon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </TableTools>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marka / Model</TableHead>
              <TableHead>Növ</TableHead>
              <TableHead>Qaraj növü</TableHead>
              <TableHead>Şassi nömrəsi</TableHead>
              <TableHead>Qeydiyyat</TableHead>
              <TableHead className="r">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: COLUMN_COUNT }).map((__, c) => (
                    <TableCell key={`sk-${i}-${c}`}>
                      <span className="skel w-70 block" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading &&
              !isError &&
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <span className="tc-thumb">
                      <Truck />
                    </span>
                    <b className="font-semibold">
                      {vehicle.make} {vehicle.model}
                    </b>
                  </TableCell>
                  <TableCell>{vehicle.vehicle_type ?? '—'}</TableCell>
                  <TableCell>{GARAGE_TYPE_LABEL[vehicle.garage_type]}</TableCell>
                  <TableCell className="mono">
                    {vehicle.chassis_number ?? '—'}
                  </TableCell>
                  <TableCell className="mono">
                    {vehicle.plate_number ?? '—'}
                  </TableCell>
                  <TableCell className="r">
                    <Badge variant={STATUS_VARIANT[vehicle.status]}>
                      {STATUS_LABEL[vehicle.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {!isLoading && !isError && vehicles.length === 0 && (
          <Empty
            title="Texnika tapılmadı"
            description="Seçilmiş filiala uyğun heç bir texnika əlavə edilməyib."
            icon={<Truck className="mx-auto h-12 w-12" />}
            action={
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4" />
                Yeni texnika
              </Button>
            }
          />
        )}

        {!isLoading && !isError && meta && meta.total_items > 0 && (
          <Pagination
            page={page}
            totalPages={meta.total_pages}
            totalItems={meta.total_items}
            pageSize={meta.size || PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </TableWrap>
    </div>
  );
}
