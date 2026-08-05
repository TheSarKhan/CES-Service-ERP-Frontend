import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Outer card wrapper for a data table (kit `.table-wrap`). */
const TableWrap = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('table-wrap', className)} {...props} />
));
TableWrap.displayName = 'TableWrap';

/** Header toolbar with title + actions (kit `.table-tools`). */
const TableTools = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('table-tools', className)} {...props} />
));
TableTools.displayName = 'TableTools';

/** The `<table class="tbl">` element. */
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table ref={ref} className={cn('tbl', className)} {...props} />
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>((props, ref) => <thead ref={ref} {...props} />);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>((props, ref) => <tbody ref={ref} {...props} />);
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn(className)} {...props} />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn(className)} {...props} />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn(className)} {...props} />
));
TableCell.displayName = 'TableCell';

export type SortDirection = 'asc' | 'desc';

/** Which column a table is ordered by, and which way. */
export interface SortState {
  field: string;
  dir: SortDirection;
}

/**
 * A column header you can order by.
 *
 * Clicking flips between ascending and descending only — there is no third "unsorted" click. Every
 * list already arrives in some order, so "off" would mean silently falling back to an order the
 * header no longer names, which reads as the sort having broken.
 *
 * The caller decides what sorting means: server-paged tables pass the field to the API, small
 * fully-loaded ones sort in memory with {@link useClientSort}. Sorting one page of many in the
 * browser is not offered, because it looks like sorting and isn't.
 */
const SortableTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    field: string;
    sort: SortState | null;
    onSortChange: (next: SortState) => void;
    /** First click order. Dates and quantities usually want the largest first. */
    defaultDir?: SortDirection;
  }
>(({ className, field, sort, onSortChange, defaultDir = 'asc', children, ...props }, ref) => {
  const active = sort?.field === field;
  const dir = active ? sort!.dir : null;

  return (
    <th
      ref={ref}
      className={cn('cursor-pointer select-none', className)}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      {...props}
    >
      <button
        type="button"
        // Inherit rather than restyle: the kit uppercases and letter-spaces `.tbl th`, and a
        // button that reset those would sit visibly apart from the headers beside it.
        className="inline-flex items-center gap-1 font-[inherit] text-[inherit] uppercase tracking-[inherit]"
        onClick={() =>
          onSortChange({ field, dir: active ? (dir === 'asc' ? 'desc' : 'asc') : defaultDir })
        }
      >
        {children}
        {!active && <ChevronsUpDown className="h-3 w-3 opacity-30" aria-hidden />}
        {active && dir === 'asc' && <ArrowUp className="h-3 w-3 text-gold" aria-hidden />}
        {active && dir === 'desc' && <ArrowDown className="h-3 w-3 text-gold" aria-hidden />}
      </button>
    </th>
  );
});
SortableTableHead.displayName = 'SortableTableHead';

/**
 * In-memory ordering for tables that hold every row at once.
 *
 * `getValue` returns what to compare, so a column can sort by something other than what it prints
 * — a date by its timestamp, a badge by its underlying status. Nullish values always sink to the
 * bottom regardless of direction: "unknown" is not smaller than everything, it is missing, and
 * flipping the arrow should not float a block of blanks to the top.
 */
function useClientSort<T>(
  rows: T[],
  sort: SortState | null,
  getValue: (row: T, field: string) => string | number | null | undefined,
): T[] {
  return React.useMemo(() => {
    if (!sort) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = getValue(a, sort.field);
      const bv = getValue(b, sort.field);
      const aEmpty = av === null || av === undefined || av === '';
      const bEmpty = bv === null || bv === undefined || bv === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      // localeCompare with 'az' so ə, ı, ö, ş, ç and friends land where a reader expects them.
      return String(av).localeCompare(String(bv), 'az', { numeric: true }) * factor;
    });
  }, [rows, sort, getValue]);
}

export {
  TableWrap,
  TableTools,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  SortableTableHead,
  TableRow,
  TableCell,
  useClientSort,
};
