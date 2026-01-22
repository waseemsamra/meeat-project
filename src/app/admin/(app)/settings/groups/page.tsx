

'use client';

import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Group, Role } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const ROLES: Role[] = ['ADMIN', 'STAFF', 'CONTENT_MANAGER', 'ACCOUNTANT', 'CUSTOMER'];

const groupSchema = z.object({
  name: z.string().min(2, { message: 'Group name must be at least 2 characters.' }),
  roles: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one role.",
  }),
});

const formFields = [
  {
    name: 'name' as const,
    label: 'Group Name',
    placeholder: 'e.g., Administrators',
  },
  {
    name: 'roles' as const,
    label: 'Roles',
    placeholder: '',
    type: 'checkbox' as const,
    options: ROLES.map(role => ({ value: role, label: role })),
  },
];


const CustomAttributePage = () => {
  const columns: ColumnDef<Group>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'roles',
      header: 'Roles',
      cell: ({ row }) => (row.original.roles || []).join(', '),
    },
  ];

  return (
    <AttributeManagementPage<Group>
      collectionName="groups"
      title="Groups"
      description="Manage user groups and their assigned roles."
      columns={columns}
      formSchema={groupSchema}
      renderCustomFormField={({ field, form }) => {
        if (field.name === 'roles') {
          return (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Roles</FormLabel>
              </div>
              <div className="space-y-2">
                {ROLES.map((role) => (
                  <FormField
                    key={role}
                    control={form.control}
                    name="roles"
                    render={({ field: checkboxField }) => {
                      return (
                        <FormItem
                          key={role}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={checkboxField.value?.includes(role)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? checkboxField.onChange([...(checkboxField.value || []), role])
                                  : checkboxField.onChange(
                                      (checkboxField.value || [])?.filter(
                                        (value) => value !== role
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {role}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          );
        }
        return null;
      }}
      formFields={formFields}
    />
  );
};

export default CustomAttributePage;
