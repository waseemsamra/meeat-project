
'use client';

import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Language } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';

const languageSchema = z.object({
  name: z.string().min(2, { message: 'Language name must be at least 2 characters.' }),
  code: z.string().length(2, { message: 'Language code must be exactly 2 characters.' }).regex(/^[A-Z]{2}$/, { message: 'Code must be 2 uppercase letters.' }),
});

const columns: ColumnDef<Language>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'code',
    header: 'Code',
  },
];

const formFields = [
  {
    name: 'name' as const,
    label: 'Language Name',
    placeholder: 'e.g., English',
  },
  {
    name: 'code' as const,
    label: 'Language Code (2-letter ISO)',
    placeholder: 'e.g., EN',
  },
];

export default function AdminLanguagesPage() {
  return (
    <AttributeManagementPage<Language>
      collectionName="languages"
      title="Languages"
      description="Manage the languages available for your store."
      columns={columns}
      formSchema={languageSchema}
      formFields={formFields}
    />
  );
}
