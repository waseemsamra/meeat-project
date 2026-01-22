

'use client';

import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Style } from '@/lib/types';
import { z } from 'zod';

const styleSchema = z.object({
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
    label: 'Style Name (English)',
    placeholder: 'e.g., Lean Edges',
  },
];

export default function AdminStylesPage() {
  return (
    <AttributeManagementPage<Style>
      collectionName="styles"
      title="Styles"
      description="Manage the preparation styles for your products."
      columns={columns}
      formSchema={styleSchema}
      formFields={formFields}
    />
  );
}

