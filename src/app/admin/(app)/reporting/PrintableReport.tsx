
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { DateRange } from "react-day-picker";
import { format } from 'date-fns';
import { ReportHeader } from "./ReportHeader";

interface PrintableReportProps {
  id?: string;
  title?: string;
  dateRange?: DateRange;
  columns: ColumnDef<any>[];
  data: any[];
  isLoading?: boolean;
  isEmbedded?: boolean;
  multiRowHeader?: boolean;
}

export function PrintableReport({
  id,
  title,
  dateRange,
  columns,
  data,
  isLoading = false,
  isEmbedded = false,
  multiRowHeader = false,
}: PrintableReportProps) {
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const dateRangeString = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
      : format(dateRange.from, "LLL dd, y")
    : 'N/A';

  const renderHeader = () => {
    if (multiRowHeader) {
      return (
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2} className="align-bottom printable-cell">Product Name</TableHead>
            <TableHead colSpan={2} className="text-center printable-cell">Opening Balance</TableHead>
            <TableHead colSpan={2} className="text-center printable-cell">In</TableHead>
            <TableHead colSpan={2} className="text-center printable-cell">Out</TableHead>
            <TableHead colSpan={2} className="text-center printable-cell">Closing Balance</TableHead>
          </TableRow>
          <TableRow>
            <TableHead className="text-center printable-cell">No</TableHead>
            <TableHead className="text-center printable-cell">KG</TableHead>
            <TableHead className="text-center printable-cell">No</TableHead>
            <TableHead className="text-center printable-cell">KG</TableHead>
            <TableHead className="text-center printable-cell">No</TableHead>
            <TableHead className="text-center printable-cell">KG</TableHead>
            <TableHead className="text-center printable-cell">No</TableHead>
            <TableHead className="text-center printable-cell">KG</TableHead>
          </TableRow>
        </TableHeader>
      )
    }
    return (
        <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="printable-cell">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
                ))}
            </TableRow>
            ))}
        </TableHeader>
    )
  }

  return (
    <div id={id}>
      {!isEmbedded && (
        <div className="report-header mb-8">
            <ReportHeader />
            <div className="mt-8">
                <h2 className="text-2xl font-semibold">{title}</h2>
                <p className="text-muted-foreground">{dateRangeString}</p>
            </div>
        </div>
      )}
      <Table className="printable-table">
        {renderHeader()}
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
                  <TableCell key={j} className="printable-cell"><Skeleton className="h-5 w-full" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="printable-cell">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center printable-cell">
                No data available for the selected criteria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
