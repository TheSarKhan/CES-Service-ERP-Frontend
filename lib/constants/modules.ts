import {
  LayoutDashboard,
  Truck,
  Users,
  ClipboardList,
  Wrench,
  Warehouse,
  ClipboardCheck,
  Gauge,
  Archive,
  FileText,
  BarChart3,
  Bell,
  RefreshCw,
  UserCog,
  ShieldCheck,
  ScrollText,
  Settings,
  Settings2,
  SearchCheck,
  Search,
  type LucideIcon,
} from 'lucide-react';

/** A single navigation entry rendered in the sidebar. */
export interface NavModule {
  /** Stable key (module code). */
  key: string;
  /** Azerbaijani label shown in the UI. */
  label: string;
  /** App Router href. */
  href: string;
  /** lucide-react icon component. */
  icon: LucideIcon;
  /**
   * Permission code required to see this entry (SRS §M16). `null` => always
   * visible to any authenticated user (e.g. Dashboard).
   */
  permission: string | null;
  /**
   * Whether the route has real content yet, vs. still being a
   * `ModulePlaceholder` stub. Unbuilt modules are hidden from the sidebar
   * entirely until they're built (see `Sidebar`).
   */
  built?: boolean;
  /** Sub-items rendered as a collapsible dropdown under this entry. */
  children?: NavModule[];
}

/** A labelled group of navigation entries. */
export interface NavGroup {
  /** Azerbaijani group heading. */
  label: string;
  modules: NavModule[];
}

/**
 * Sidebar navigation config — the 19 SRS modules grouped logically.
 * Azerbaijani labels; English identifiers and routes.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Ümumi',
    modules: [
      {
        key: 'M02_DASHBOARD',
        label: 'İdarə paneli',
        href: '/',
        icon: LayoutDashboard,
        permission: null,
        built: true,
      },
    ],
  },
  {
    label: 'Əməliyyatlar',
    modules: [
      {
        key: 'M03_VEHICLES',
        label: 'Qaraj (Texnika)',
        href: '/vehicles',
        icon: Truck,
        permission: 'VEHICLE_READ',
      },
      {
        key: 'M04_CUSTOMERS',
        label: 'Müştərilər',
        href: '/customers',
        icon: Users,
        permission: 'CUSTOMER_READ',
      },
      {
        key: 'M05_SERVICE_REQUESTS',
        label: 'Servis sorğuları',
        href: '/service-requests',
        icon: ClipboardList,
        permission: 'SR_READ',
      },
      {
        key: 'M06_WORK_ORDERS',
        label: 'İş sifarişləri',
        href: '/work-orders',
        icon: Wrench,
        permission: 'WO_READ',
      },
      {
        key: 'M19_WAREHOUSE',
        label: 'Anbar & Ehtiyat',
        href: '/warehouse',
        icon: Warehouse,
        permission: 'WH_READ',
        built: true,
        children: [
          {
            key: 'M19_WAREHOUSE_MAIN',
            label: 'Anbar',
            href: '/warehouse',
            icon: Warehouse,
            permission: 'WH_READ',
            built: true,
          },
          {
            key: 'M19_WAREHOUSE_CONFIG',
            label: 'Anbar Konfiqurasiya',
            href: '/warehouse/configuration',
            icon: Settings2,
            permission: 'WH_READ',
            built: true,
          },
          {
            key: 'M19_WAREHOUSE_SEARCH',
            label: 'Məhsul axtarışı',
            href: '/warehouse/search',
            icon: Search,
            permission: 'WH_READ',
            built: true,
          },
          {
            key: 'M19_WAREHOUSE_WARRANTY',
            label: 'Zəmanət axtarışı',
            href: '/warehouse/warranty',
            icon: SearchCheck,
            permission: 'WH_READ',
            built: true,
          },
          {
            key: 'M19_WAREHOUSE_APPROVALS',
            label: 'Təsdiqləmələr',
            href: '/approvals',
            icon: ShieldCheck,
            permission: 'APPROVAL_READ',
            built: true,
          },
        ],
      },
      {
        key: 'M18_INSPECTIONS',
        label: 'Texniki baxış',
        href: '/inspections',
        icon: ClipboardCheck,
        permission: 'INSP_READ',
      },
      {
        key: 'M08_ENGINE_HOURS',
        label: 'Motosaat',
        href: '/engine-hours',
        icon: Gauge,
        permission: 'EH_READ',
      },
    ],
  },
  {
    label: 'Sənəd & Hesabat',
    modules: [
      {
        key: 'M09_ARCHIVE',
        label: 'Arxiv',
        href: '/archive',
        icon: Archive,
        permission: 'ARCHIVE_READ',
      },
      {
        key: 'M10_DOCUMENTS',
        label: 'Sənədlər',
        href: '/documents',
        icon: FileText,
        permission: 'DOC_READ',
      },
      {
        key: 'M11_REPORTS',
        label: 'Hesabatlar',
        href: '/reports',
        icon: BarChart3,
        permission: 'REPORT_READ',
      },
      {
        key: 'M12_NOTIFICATIONS',
        label: 'Bildirişlər',
        href: '/notifications',
        icon: Bell,
        permission: null,
      },
      {
        key: 'M13_ERP_INTEGRATION',
        label: 'CES ERP inteqrasiyası',
        href: '/erp-integration',
        icon: RefreshCw,
        permission: 'SYNC_ERP',
      },
    ],
  },
  {
    label: 'İnzibati',
    modules: [
      {
        key: 'M15_USERS',
        label: 'İstifadəçilər',
        href: '/users',
        icon: UserCog,
        permission: 'USER_READ',
      },
      {
        key: 'M16_ROLES',
        label: 'Rollar & İcazələr',
        href: '/roles',
        icon: ShieldCheck,
        permission: 'ROLE_READ',
        built: true,
      },
      {
        key: 'M17_AUDIT',
        label: 'Audit jurnalı',
        href: '/audit-logs',
        icon: ScrollText,
        permission: 'AUDIT_READ',
      },
      {
        key: 'SETTINGS',
        label: 'Tənzimləmələr',
        href: '/settings',
        icon: Settings,
        permission: null,
      },
    ],
  },
];

/** Flattened module list (useful for breadcrumbs / lookups). */
export const ALL_MODULES: NavModule[] = NAV_GROUPS.flatMap((g) =>
  g.modules.flatMap((m) => (m.children ? [m, ...m.children] : [m])),
);
