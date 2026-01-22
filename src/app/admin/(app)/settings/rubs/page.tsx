

'use client';

import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Rub } from '@/lib/types';
import { z } from 'zod';

const rubSchema = z.object({
  name: z.object({ en: z.string().min(2, "English name is required.") }).passthrough(),
});

const columns = [
  {
    accessorKey: 'name.en',
    header: 'Name (English)',
  },
];

const formFields = [
  {
    name: 'name.en' as const,
    label: 'Rub Name (English)',
    placeholder: 'e.g., Coffee Rub',
  },
];

export default function AdminRubsPage() {
  return (
    <AttributeManagementPage<Rub>
      collectionName="rubs"
      title="Rubs"
      description="Manage the seasoning rubs available for your products."
      columns={columns}
      formSchema={rubSchema}
      formFields={formFields}
    />
  );
}

