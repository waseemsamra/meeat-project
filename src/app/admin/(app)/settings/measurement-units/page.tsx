

'use client';

import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { MeasurementUnit } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';

const measurementUnitSchema = z.object({
  name: z.string().min(2, { message: 'Unit name must be at least 2 characters.' }),
  symbol: z.string().min(1, { message: 'Symbol is required.' }),
});

const columns: ColumnDef<MeasurementUnit>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'symbol',
    header: 'Symbol',
  },
];

const formFields = [
  {
    name: 'name' as const,
    label: 'Unit Name',
    placeholder: 'e.g., Pound',
  },
  {
    name: 'symbol' as const,
    label: 'Symbol',
    placeholder: 'e.g., lb',
  },
];

export default function AdminMeasurementUnitsPage() {
  return (
    <AttributeManagementPage<MeasurementUnit>
      collectionName="measurementUnits"
      title="Measurement Units"
      description="Manage units of measurement for product weights."
      columns={columns}
      formSchema={measurementUnitSchema}
      formFields={formFields}
    />
  );
}
