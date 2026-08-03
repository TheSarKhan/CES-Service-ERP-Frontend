'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useWarrantySummary } from '@/hooks/use-inventory';
import { NAV_GROUPS, type NavModule } from '@/lib/constants/modules';
import { LogoTile } from './LogoTile';
import { cn } from '@/lib/utils';

/**
 * Left navigation using the kit's dark graphite sidebar (`.sd-*`). Hides any
 * entry the current user lacks permission for (SRS §4.4 / §M16), and any
 * module that isn't built yet (`built` unset) — those come back into the
 * sidebar as they're finished, module by module. A module with `children`
 * renders as a collapsible dropdown instead of a direct link.
 */
export function Sidebar() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Warranties needing attention, surfaced as a count so it's visible without opening the page.
  const { data: warranty } = useWarrantySummary();
  const warrantyAlerts = (warranty?.expiringSoonTotal ?? 0) + (warranty?.expiredTotal ?? 0);

  const canSee = (module: NavModule): boolean =>
    module.permission === null || hasPermission(module.permission);

  const isActive = (href: string): boolean =>
    pathname === href || pathname.startsWith(`${href}/`);

  // Sibling child routes can share a URL prefix (e.g. /warehouse vs.
  // /warehouse/configuration), so a child link is only active on an exact match —
  // prefix matching would light up "Anbar" while on "Anbar Konfiqurasiya" too.
  const isChildActive = (href: string): boolean => pathname === href;

  function toggleExpanded(key: string, defaultValue: boolean) {
    setExpanded((prev) => ({ ...prev, [key]: !(prev[key] ?? defaultValue) }));
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-3 self-stretch bg-graphite p-3.5 text-white md:flex">
      {/* Brand */}
      <div className="sd-brand">
        <LogoTile size={42} />
        <div>
          <div className="sd-name">
            Construction <span>Equipment</span> Services
          </div>
          <div className="sd-sub">Service</div>
        </div>
      </div>

      {/* Sections */}
      <nav className="flex flex-col gap-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const visible = group.modules.filter(canSee).filter((m) => m.built);
          if (visible.length === 0) return null;

          return (
            <div key={group.label} className="sd-section">
              <p className="sd-lab">{group.label}</p>
              {visible.map((module) => {
                const Icon = module.icon;

                if (module.children) {
                  const childrenVisible = module.children.filter(canSee).filter((m) => m.built);
                  if (childrenVisible.length === 0) return null;

                  const anyChildActive = childrenVisible.some((c) => isChildActive(c.href));
                  const isExpanded = expanded[module.key] ?? anyChildActive;

                  return (
                    <div key={module.key}>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(module.key, anyChildActive)}
                        className={cn('sd-item w-full', anyChildActive && 'text-gold')}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="truncate">{module.label}</span>
                        {isExpanded ? (
                          <ChevronDown className="ml-auto h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-white/10 pl-2">
                          {childrenVisible.map((child) => {
                            const ChildIcon = child.icon;
                            const active = isChildActive(child.href);
                            return (
                              <Link
                                key={child.key}
                                href={child.href}
                                className={cn('sd-item', active && 'active')}
                              >
                                <ChildIcon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{child.label}</span>
                                {child.key === 'M19_WAREHOUSE_WARRANTY' && warrantyAlerts > 0 && (
                                  <span className="ml-auto shrink-0 rounded-full bg-warn px-1.5 py-0.5 text-[11px] font-bold leading-none text-graphite">
                                    {warrantyAlerts}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = isActive(module.href);
                return (
                  <Link
                    key={module.key}
                    href={module.href}
                    className={cn('sd-item', active && 'active')}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{module.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
