
'use client';

import { useMemo, useEffect } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Notification, User } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';

const notificationSchema = z.object({
  userId: z.string().min(1, 'Target user is required.'),
  title: z.string().min(1, 'Title is required.'),
  body: z.string().min(1, 'Message body is required.'),
  type: z.enum(['order_update', 'promotion', 'system']).default('system'),
  relatedId: z.string().optional(),
  read: z.boolean().default(false),
  createdAt: z.date().optional().default(() => new Date()),
  name: z.string().optional(), // For internal compatibility
});

export default function AdminNotificationsPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();

  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const notificationsQuery = useMemo(() => 
    firestore ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')) : null, 
    [firestore]
  );

  const columns: ColumnDef<Notification>[] = useMemo(() => [
    {
      accessorKey: 'createdAt',
      header: 'Sent On',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: 'targetUser',
      header: 'User',
      cell: ({ row }) => {
        const user = users?.find(u => u.id === row.original.userId);
        return user ? (
            <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
        ) : 'Unknown User';
      },
    },
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={row.original.type === 'promotion' ? 'default' : 'secondary'} className="capitalize">
          {row.original.type.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.read ? 'outline' : 'destructive'}>
          {row.original.read ? 'Read' : 'Unread'}
        </Badge>
      ),
    },
  ], [users]);

  const formFields = useMemo(() => [
    {
      name: 'userId' as const,
      label: 'Target User',
      placeholder: 'Select a user to notify',
      type: 'select' as const,
      options: users?.map(u => ({ value: u.id, label: `${u.name || 'No Name'} (${u.email})` })) || [],
      isLoading: isLoadingUsers,
    },
    {
      name: 'type' as const,
      label: 'Notification Type',
      placeholder: 'Select type',
      type: 'select' as const,
      options: [
        { value: 'promotion', label: 'Promotion' },
        { value: 'order_update', label: 'Order Update' },
        { value: 'system', label: 'System Alert' },
      ],
    },
    { name: 'title' as const, label: 'Title', placeholder: 'e.g., Flash Sale: 20% Off Ribeye!' },
    { name: 'body' as const, label: 'Message Body', placeholder: 'Enter your message here...' },
    { name: 'relatedId' as const, label: 'Related Entity ID (Optional)', placeholder: 'e.g., Order ID' },
    { name: 'name' as const, label: 'Internal Name', placeholder: '', type: 'hidden' as const },
  ], [users, isLoadingUsers]);

  // Sync title to 'name' for the attribute manager
  const useCustomFormHook = () => {
    const form = require('react-hook-form').useForm({
      resolver: require('@hookform/resolvers/zod').zodResolver(notificationSchema),
      defaultValues: {
        userId: '',
        title: '',
        body: '',
        type: 'promotion',
        relatedId: '',
        read: false,
        name: '',
      }
    });

    const title = form.watch('title');
    useEffect(() => {
      if (title) form.setValue('name', title);
    }, [title, form]);

    return form;
  };

  return (
    <AttributeManagementPage<Notification>
      collectionName="notifications"
      title="Notifications"
      description="Manage and send push notifications to your mobile app users."
      columns={columns}
      formSchema={notificationSchema}
      formFields={formFields}
      useCustomFormHook={useCustomFormHook}
    />
  );
}
