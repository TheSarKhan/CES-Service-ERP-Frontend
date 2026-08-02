'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { NAV_GROUPS, type NavModule } from '@/lib/constants/modules';
import { LogoTile } from './LogoTile';
import { cn } from '@/lib/utils';

/**
 * Left navigation using the kit's dark graphite sidebar (`.sd-*`). Hides any
 * entry the current user lacks permission for (SRS §4.4 / §M16). Active item
 * gets the gold background. Modules without real content yet (`built` unset)
 * render locked — visible for context, but not a navigable link.
 */
export function Sidebar() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const canSee = (module: NavModule): boolean =>
    module.permission === null || hasPermission(module.permission);

  const isActive = (href: string): boolean =>
    pathname === href || pathname.startsWith(`${href}/`);

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
          const visible = group.modules.filter(canSee);
          if (visible.length === 0) return null;

          return (
            <div key={group.label} className="sd-section">
              <p className="sd-lab">{group.label}</p>
              {visible.map((module) => {
                const Icon = module.icon;

                if (!module.built) {
                  return (
                    <div
                      key={module.key}
                      className="sd-item cursor-not-allowed opacity-50"
                      title="Tezliklə əlçatan olacaq"
                      aria-disabled="true"
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="truncate">{module.label}</span>
                      <Lock className="ml-auto h-3.5 w-3.5 shrink-0" />
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
