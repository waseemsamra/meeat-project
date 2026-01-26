

'use client';

import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Currency } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const currencySchema = z.object({
  name: z.string().min(2, { message: 'Currency name must be at least 2 characters.' }),
  code: z.string().length(3, { message: 'Currency code must be exactly 3 characters.' }).regex(/^[A-Z]{3}$/, { message: 'Code must be 3 uppercase letters.' }),
  symbol: z.string().min(1, { message: 'Symbol is required.' }),
  isDefault: z.boolean().optional(),
  conversionRate: z.coerce.number().optional(),
  status: z.enum(['enabled', 'disabled']).default('enabled'),
});

const columns: ColumnDef<Currency>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'code',
    header: 'Code',
  },
  {
    accessorKey: 'symbol',
    header: 'Symbol',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'enabled' ? 'default' : 'destructive'}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'isDefault',
    header: 'Default',
    cell: ({ row }) => (row.original.isDefault ? <Badge>Default</Badge> : null),
  },
  {
    accessorKey: 'conversionRate',
    header: 'Conversion Rate',
    cell: ({ row }) => {
        if (row.original.isDefault) return '1.00';
        return row.original.conversionRate ? row.original.conversionRate.toFixed(4) : 'N/A'
    }
  },
];

const formFields = [
  {
    name: 'name' as const,
    label: 'Currency Name',
    placeholder: 'e.g., United States Dollar',
  },
  {
    name: 'code' as const,
    label: 'Currency Code (3-letter ISO)',
    placeholder: 'e.g., USD',
  },
  {
    name: 'symbol' as const,
    label: 'Symbol',
    placeholder: 'e.g., $',
  },
  {
    name: 'status' as const,
    label: 'Status',
    type: 'select' as const,
    options: [
        { value: 'enabled', label: 'Enabled' },
        { value: 'disabled', label: 'Disabled' }
    ]
  },
  {
    name: 'isDefault' as const,
    label: 'Default Currency',
    type: 'checkbox' as const,
    description: 'Set this as the base currency for your store.'
  },
  {
    name: 'conversionRate' as const,
    label: 'Conversion Rate',
    placeholder: 'e.g., 1.0',
    type: 'number' as const,
    description: 'The rate against the default currency.'
  },
];

export default function AdminCurrenciesPage() {
  return (
    <AttributeManagementPage<Currency>
      collectionName="currencies"
      title="Currencies"
      description="Manage the currencies for your store."
      columns={columns}
      formSchema={currencySchema}
      formFields={formFields}
      renderCustomFormField={({ field, form }) => {
        if (field.type === 'checkbox' && field.name === 'isDefault') {
            return (
                <FormField
                    key={String(field.name)}
                    control={form.control}
                    name={field.name}
                    render={({ field: formField }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                checked={formField.value}
                                onCheckedChange={formField.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>{field.label}</FormLabel>
                                <FormDescription>{field.description}</FormDescription>
                            </div>
                        </FormItem>
                    )}
                />
            )
        }
        if (field.type === 'number' && field.name === 'conversionRate') {
            const isDefault = form.watch('isDefault');
            return (
                <FormField
                    key={String(field.name)}
                    control={form.control}
                    name={field.name}
                    render={({ field: formField }) => (
                        <FormItem>
                            <FormLabel>{field.label}</FormLabel>
                            <FormControl>
                                <Input
                                placeholder={field.placeholder}
                                type="number"
                                step="0.0001"
                                {...form.register(field.name, { valueAsNumber: true })}
                                disabled={isDefault}
                                value={isDefault ? 1 : formField.value || ''}
                                />
                            </FormControl>
                            <FormDescription>{field.description}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )
        }
        return null;
      }}
    />
  );
}

    