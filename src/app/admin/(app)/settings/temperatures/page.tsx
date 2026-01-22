

'use client';

import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Temperature } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';

const temperatureSchema = z.object({
  name: z.object({ en: z.string().min(2, "English name is required.") }).passthrough(),
});

const columns: ColumnDef<Temperature>[] = [
  {
    accessorKey: 'name.en',
    header: 'Name (English)',
  },
];

const formFields = [
  {
    name: 'name.en' as const,
    label: 'Temperature Name (English)',
    placeholder: 'e.g., Fresh or Frozen',
  },
];

export default function AdminTemperaturesPage() {
  return (
    <AttributeManagementPage<Temperature>
      collectionName="temperatures"
      title="Temperatures"
      description="Manage product temperatures (e.g., Fresh, Frozen)."
      columns={columns}
      formSchema={temperatureSchema}
      formFields={formFields}
    />
  );
}

