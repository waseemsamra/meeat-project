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
import { Megaphone, User as UserIcon, Calendar, Clock } from 'lucide-react';
import { format, isValid } from 'date-fns';

const notificationSchema = z.object({
  userId: z.string().min(1, 'Target user is required.'),
  title: z.string().min(1, 'Title is required.'),
  body: z.string().min(1, 'Message body is required.'),
  type: z.enum(['order_update', 'promotion', 'system']).default('system'),
  relatedId: z.string().optional(),
  read: z.boolean().default(false),
  createdAt: z.date().optional().default(() => new Date()),
  scheduledAt: z.date({ required_error: 'Schedule date/time is required.' }),
  name: z.string().optional(), // For internal compatibility
});

export default function AdminNotificationsPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();

  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const columns: ColumnDef<Notification>[] = useMemo(() => [
    {
      accessorKey: 'scheduledAt',
      header: 'Scheduled For',
      cell: ({ row }) => {
        const scheduledAtVal = row.original.scheduledAt;
        const date = scheduledAtVal ? new Date(scheduledAtVal) : null;
        
        // Safety check to prevent "Invalid time value" crash
        if (!date || !isValid(date)) {
            return <span className="text-muted-foreground italic text-xs">Immediate</span>;
        }

        const isFuture = date > new Date();
        return (
            <div className="flex flex-col">
                <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3" />
                    {format(date, 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(date, 'h:mm a')}
                    {isFuture && <Badge variant="outline" className="ml-2 text-[10px] h-4">Pending</Badge>}
                </div>
            </div>
        );
      },
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
                    <span>Broadcast</span>
                </div>
            );
        }
        const user = users?.find(u => u.id === userId);
        return user ? (
            <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div className="truncate max-w-[150px]">
                    <div className="font-medium text-sm truncate">{user.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
            </div>
        ) : <span className="text-muted-foreground italic">Target: {userId}</span>;
      },
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <div className="font-medium line-clamp-1">{row.original.title}</div>
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={row.original.type === 'promotion' ? 'default' : 'secondary'} className="capitalize text-[10px]">
          {row.original.type.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Sync',
      cell: ({ row }) => (
        <Badge variant={row.original.read ? 'outline' : 'secondary'} className="text-[10px]">
          {row.original.userId === 'ALL' ? 'Global' : (row.original.read ? 'Read' : 'Unread')}
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
        { name: 'scheduledAt' as const, label: 'Schedule Date & Time', placeholder: 'Select date and time', type: 'date' as const },
        { name: 'title' as const, label: 'Message Title', placeholder: 'e.g., Weekly Special: 15% Off!' },
        { name: 'body' as const, label: 'Short Description', placeholder: 'Enter the notification message here...' },
        { name: 'relatedId' as const, label: 'Link to Entity ID (Optional)', placeholder: 'e.g., Order ID or Product ID' },
        { name: 'name' as const, label: 'Internal Reference', placeholder: '', type: 'hidden' as const },
      ];
  }, [users, isLoadingUsers]);

  const useCustomFormHook = () => {
    const { useForm } = require('react-hook-form');
    const { zodResolver } = require('@hookform/resolvers/zod');
    
    const form = useForm({
      resolver: zodResolver(notificationSchema),
      defaultValues: {
        userId: 'ALL',
        title: '',
        body: '',
        type: 'promotion',
        relatedId: '',
        read: false,
        name: '',
        scheduledAt: new Date(),
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
      description="Manage automated order alerts and schedule manual broadcast or personal messages for the mobile app."
      columns={columns}
      formSchema={notificationSchema}
      formFields={formFields}
      useCustomFormHook={useCustomFormHook}
    />
  );
}
