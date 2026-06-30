'use client';

import {
  ClipboardList,
  Wrench,
  Banknote,
  PackageX,
  type LucideIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { KpiGrid, KpiCard } from '@/components/ui/kpi-card';

interface Kpi {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  icon: LucideIcon;
  gold?: boolean;
}

// Placeholder stats — replaced by /api/v1 dashboard endpoints later (M02).
const KPIS: Kpi[] = [
  {
    label: 'Aktiv sorğular',
    value: '38',
    delta: '+12% bu həftə',
    icon: ClipboardList,
    gold: true,
  },
  {
    label: 'Açıq Work Order',
    value: '24',
    delta: '6 təcili',
    icon: Wrench,
  },
  {
    label: 'Bu ay gəlir',
    value: '48,250',
    unit: '₼',
    delta: '+8% keçən aya görə',
    icon: Banknote,
  },
  {
    label: 'Aşağı stok',
    value: '9',
    delta: 'Diqqət tələb olunur',
    icon: PackageX,
  },
];

const CHART_DATA = [
  { month: 'Yan', orders: 32 },
  { month: 'Fev', orders: 41 },
  { month: 'Mar', orders: 38 },
  { month: 'Apr', orders: 55 },
  { month: 'May', orders: 47 },
  { month: 'İyn', orders: 63 },
];

interface Activity {
  id: string;
  title: string;
  detail: string;
  time: string;
  dot: '' | 'gold' | 'ok' | 'warn' | 'danger';
}

const RECENT_ACTIVITY: Activity[] = [
  {
    id: '1',
    title: 'WO-1042 bağlandı',
    detail: 'Caterpillar 320D — texniki baxış tamamlandı',
    time: '12 dəq əvvəl',
    dot: 'ok',
  },
  {
    id: '2',
    title: 'Yeni servis sorğusu',
    detail: 'Komatsu PC200 — pullu servis',
    time: '38 dəq əvvəl',
    dot: 'gold',
  },
  {
    id: '3',
    title: 'Anbar çıxışı',
    detail: 'Yağ filtri ×4 — WO-1039',
    time: '1 saat əvvəl',
    dot: '',
  },
  {
    id: '4',
    title: 'Motosaat xəbərdarlığı',
    detail: 'JCB 3CX — 250 saat servis həddi',
    time: '2 saat əvvəl',
    dot: 'warn',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">İdarə paneli</h1>
        <p className="text-sm text-muted-foreground">
          Servis əməliyyatlarının ümumi görünüşü
        </p>
      </div>

      <KpiGrid>
        {KPIS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <KpiCard
              key={kpi.label}
              hero={i === 0}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              goldIcon={kpi.gold}
              icon={<Icon className="h-5 w-5" />}
              delta={<span>{kpi.delta}</span>}
            />
          );
        })}
      </KpiGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart card */}
        <div className="ch-card lg:col-span-2">
          <div className="ch-head">
            <div>
              <h3>İş sifarişləri — aylıq</h3>
              <span className="muted">Son 6 ay üzrə bağlanmış sifarişlər</span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--line)"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <Tooltip
                  cursor={{ fill: 'var(--graphite-50)' }}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--line)',
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="orders" radius={[6, 6, 0, 0]} fill="var(--gold)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity timeline */}
        <div className="ch-card">
          <div className="ch-head">
            <div>
              <h3>Son fəaliyyət</h3>
              <span className="muted">Ən son hadisələr</span>
            </div>
          </div>
          <div className="tl">
            {RECENT_ACTIVITY.map((item) => (
              <div key={item.id} className="tl-row">
                <span className={`tl-dot ${item.dot}`.trim()} />
                <div className="tl-body">
                  <div className="tl-head">
                    <b>{item.title}</b>
                    <span>{item.time}</span>
                  </div>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
