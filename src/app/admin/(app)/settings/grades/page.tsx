

'use client';

import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Grade } from '@/lib/types';
import { z } from 'zod';

const gradeSchema = z.object({
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
    label: 'Grade Name (English)',
    placeholder: 'e.g., USDA Prime',
  },
];

export default function AdminGradesPage() {
  return (
    <AttributeManagementPage<Grade>
      collectionName="grades"
      title="Grades"
      description="Manage the quality grades for your products."
      columns={columns}
      formSchema={gradeSchema}
      formFields={formFields}
    />
  );
}

