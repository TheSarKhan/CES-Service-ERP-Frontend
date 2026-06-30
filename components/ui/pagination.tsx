'use client';

import { cn } from '@/lib/utils';

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Build a compact page list with ellipses. */
function buildPages(page: number, total: number): (number | 'dots')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | 'dots')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) pages.push('dots');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < total - 1) pages.push('dots');
  pages.push(total);
  return pages;
}

/** Table pagination footer (kit `.pagination`). */
export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const pages = buildPages(page, Math.max(totalPages, 1));

  return (
    <div className={cn('pagination', className)}>
      <span className="pag-info num">
        {from}–{to} / {totalItems}
      </span>
      <div className="pag-ctrl">
        <button
          type="button"
          className="pg"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Əvvəlki səhifə"
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === 'dots' ? (
            <span key={`dots-${i}`} className="pg-dots">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={cn('pg num', p === page && 'on')}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="pg"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Növbəti səhifə"
        >
          ›
        </button>
      </div>
    </div>
  );
}
