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
import { Megaphone, User as UserIcon } from 'lucide-react';

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
      header: 'Recipients',
      cell: ({ row }) => {
        const userId = row.original.userId;
        if (userId === 'ALL') {
            return (
                <div className="flex items-center gap-2 text-primary font-bold">
                    <Megaphone className="h-4 w-4" />
                    <span>App-Wide Broadcast</span>
                </div>
            );
        }
        const user = users?.find(u => u.id === userId);
        return user ? (
            <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
            </div>
        ) : <span className="text-muted-foreground italic">Target: {userId}</span>;
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
      header: 'Sync Status',
      cell: ({ row }) => (
        <Badge variant={row.original.read ? 'outline' : 'secondary'}>
          {row.original.userId === 'ALL' ? 'Broadcast' : (row.original.read ? 'Read' : 'Delivered')}
        </Badge>
      ),
    },
  ], [users]);

  const formFields = useMemo(() => {
    const userOptions = [
        { value: 'ALL', label: '📢 All Users (App-Wide Broadcast)' },
        ...(users?.map(u => ({ 
            value: u.id, 
            label: `👤 ${u.name || 'No Name'} (${u.email})` 
        })) || [])
    ];

    return [
        {
          name: 'userId' as const,
          label: 'Notification Target',
          placeholder: 'Select Recipients',
          type: 'select' as const,
          options: userOptions,
          isLoading: isLoadingUsers,
        },
        {
          name: 'type' as const,
          label: 'Category',
          placeholder: 'Select type',
          type: 'select' as const,
          options: [
            { value: 'promotion', label: 'Marketing Promotion' },
            { value: 'order_update', label: 'Order Update' },
            { value: 'system', label: 'System Announcement' },
          ],
        },
        { name: 'title' as const, label: 'Message Title', placeholder: 'e.g., Weekly Special: 15% Off!' },
        { name: 'body' as const, label: 'Short Description', placeholder: 'Enter the notification message here...' },
        { name: 'relatedId' as const, label: 'Link to Entity ID (Optional)', placeholder: 'e.g., Order ID or Product ID' },
        { name: 'name' as const, label: 'Internal Reference', placeholder: '', type: 'hidden' as const },
      ];
  }, [users, isLoadingUsers]);

  const useCustomFormHook = () => {
    const form = require('react-hook-form').useForm({
      resolver: require('@hookform/resolvers/zod').zodResolver(notificationSchema),
      defaultValues: {
        userId: 'ALL',
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
      description="Manage automated order alerts and send manual broadcast or personal messages to the mobile app."
      columns={columns}
      formSchema={notificationSchema}
      formFields={formFields}
      useCustomFormHook={useCustomFormHook}
    />
  );
}
