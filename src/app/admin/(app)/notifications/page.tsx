
'use client';

import { useMemo, useEffect, useState } from 'react';
import { AttributeManagementPage } from '@/components/admin/AttributeManagementPage';
import type { Notification, User } from '@/lib/types';
import { z } from 'zod';
import { ColumnDef } from '@tanstack/react-table';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';
import { Megaphone, User as UserIcon, Calendar, Clock, MoreHorizontal, Copy, RefreshCcw, Eye, Info } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const notificationSchema = z.object({
  userId: z.string().min(1, 'Target user is required.'),
  title: z.string().min(1, 'Title is required.'),
  body: z.string().min(1, 'Message body is required.'),
  type: z.enum(['order_update', 'promotion', 'system']).default('system'),
  relatedId: z.string().optional(),
  read: z.boolean().default(false),
  createdAt: z.date().optional().default(() => new Date()),
  scheduledAt: z.date({ required_error: 'Schedule date/time is required.' }),
  name: z.string().optional(), 
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function AdminNotificationsPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [viewItem, setViewItem] = useState<Notification | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const notificationsQuery = useMemo(() => 
    firestore ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')) : null
  , [firestore]);
  const { data: notifications, isLoading: isLoadingNotifications } = useCollection<Notification>(notificationsQuery);

  const handleResend = async (notification: Notification) => {
    if (!firestore) return;
    try {
        const { id, __path, createdAt, scheduledAt, ...cloneData } = notification as any;
        const isBroadcast = cloneData.userId === 'all';
        const newId = isBroadcast ? `broadcast_${Date.now()}` : doc(collection(firestore, 'notifications')).id;
        
        const resendData = {
            ...cloneData,
            createdAt: new Date().toISOString(),
            scheduledAt: new Date().toISOString(),
            read: false,
            // Re-ensure parity fields
            name: cloneData.title,
            info: cloneData.body,
        };
        
        await setDoc(doc(firestore, 'notifications', newId), { ...resendData, id: newId });
        toast({ 
            title: 'Notification Resent', 
            description: `"${notification.title}" has been sent again.`,
        });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Resend Failed' });
    }
  };

  const handleOpenView = (notification: Notification) => {
    setViewItem(notification);
    setIsViewOpen(true);
  };

  const columns: ColumnDef<Notification>[] = useMemo(() => [
    {
      accessorKey: 'createdAt',
      header: 'Sent/Created',
      cell: ({ row }) => {
        const dateVal = row.original.createdAt;
        const date = dateVal ? (typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal)) : null;
        if (!date || !isValid(date)) return <span className="text-muted-foreground italic text-xs">N/A</span>;
        return <span className="text-xs">{format(date, 'MMM d, h:mm a')}</span>;
      }
    },
    {
      accessorKey: 'scheduledAt',
      header: 'Scheduled For',
      cell: ({ row }) => {
        const scheduledAtVal = row.original.scheduledAt || row.original.createdAt;
        const date = scheduledAtVal ? (typeof scheduledAtVal === 'string' ? parseISO(scheduledAtVal) : new Date(scheduledAtVal)) : null;
        if (!date || !isValid(date)) return <span className="text-muted-foreground italic text-xs">Immediate</span>;
        const isFuture = date > new Date();
        return (
            <div className="flex flex-col">
                <div className="flex items-center gap-1 text-sm"><Calendar className="h-3 w-3" />{format(date, 'MMM d, yyyy')}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{format(date, 'h:mm a')}{isFuture && <Badge variant="outline" className="ml-2 text-[10px] h-4">Pending</Badge>}</div>
            </div>
        );
      },
    },
    {
      id: 'targetUser',
      header: 'Recipients',
      cell: ({ row }) => {
        const userId = row.original.userId;
        if (userId === 'all' || userId === 'broadcast') {
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
        ) : <span className="text-muted-foreground italic">ID: {userId?.substring(0,8)}...</span>;
      },
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <button onClick={() => handleOpenView(row.original)} className="font-medium text-left hover:underline hover:text-primary transition-colors line-clamp-1">
          {row.original.title}
        </button>
      )
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={row.original.type === 'promotion' ? 'default' : 'secondary'} className="capitalize text-[10px]">
          {(row.original.type || 'system').replace('_', ' ')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row, table }) => {
        const item = row.original;
        const meta = table.options.meta as any;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleOpenView(item)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                <DropdownMenuItem onClick={() => meta.handleOpenForm(item)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleResend(item)}><RefreshCcw className="mr-2 h-4 w-4" />Resend Now</DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                    const { id, __path, createdAt, ...cloneData } = item as any;
                    meta.handleOpenForm({ ...cloneData, scheduledAt: new Date() });
                }}><Copy className="mr-2 h-4 w-4" />Clone</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => meta.handleOpenAlert(item)} className="text-destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [users]);

  const formFields = useMemo(() => [
    {
      name: 'userId' as const,
      label: 'Notification Target',
      placeholder: 'Select Recipients',
      type: 'select' as const,
      options: [
        { value: 'all', label: '📢 All Users (App-Wide Broadcast)' },
        ...(users?.map(u => ({ value: u.id, label: `👤 ${u.name || 'No Name'} (${u.email})` })) || [])
      ],
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
    { name: 'title' as const, label: 'Message Title', placeholder: 'e.g., Weekly Special!' },
    { name: 'body' as const, label: 'Short Description', placeholder: 'Enter the message here...' },
    { name: 'relatedId' as const, label: 'Link to Entity ID (Optional)', placeholder: 'e.g., Order ID' },
    { name: 'name' as const, label: 'Internal Reference', placeholder: '', type: 'hidden' as const },
  ], [users, isLoadingUsers]);

  const useCustomFormHook = () => {
    const form = useForm<NotificationFormValues>({
      resolver: zodResolver(notificationSchema),
      defaultValues: { userId: 'all', title: '', body: '', type: 'promotion', relatedId: '', read: false, name: '', scheduledAt: new Date() }
    });
    const title = form.watch('title');
    useEffect(() => { if (title) form.setValue('name', title); }, [title, form]);
    return form;
  };

  // Custom onSubmit override for AttributeManagementPage
  const handleSave = async (values: any) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
        const isBroadcast = values.userId === 'all';
        const docId = selectedItem?.id || (isBroadcast ? `broadcast_${Date.now()}` : doc(collection(firestore, 'notifications')).id);
        const docRef = doc(firestore, 'notifications', docId);
        
        const finalData = {
            ...values,
            id: docId,
            createdAt: selectedItem?.createdAt || new Date().toISOString(),
            scheduledAt: values.scheduledAt instanceof Date ? values.scheduledAt.toISOString() : values.scheduledAt,
            // Add parity fields for mobile logic
            name: values.title,
            info: values.body,
        };

        await setDoc(docRef, finalData, { merge: true });
        toast({ title: 'Success', description: 'Notification saved and synced.' });
        setIsFormOpen(false);
        setSelectedItem(null);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Save Failed' });
    } finally {
        setIsSaving(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Notification | null>(null);

  return (
    <>
      <AttributeManagementPage<Notification>
        collectionName="notifications"
        title="Notifications"
        description="Manage alerts and schedule manual broadcast or personal messages for the mobile app."
        columns={columns}
        formSchema={notificationSchema}
        formFields={formFields}
        data={notifications}
        isLoading={isLoadingNotifications}
        useCustomFormHook={useCustomFormHook}
      />

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" />Notification Details</DialogTitle>
            <DialogDescription>Full record of the message sent to the mobile app.</DialogDescription>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-6 pt-4">
              <div className="space-y-1"><Label className="text-xs text-muted-foreground uppercase">Title</Label><p className="text-lg font-bold font-headline">{viewItem.title}</p></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground uppercase">Message Body</Label><div className="p-4 bg-muted/50 rounded-lg text-sm border leading-relaxed">{viewItem.body}</div></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground uppercase">Category</Label><div><Badge variant={viewItem.type === 'promotion' ? 'default' : 'secondary'} className="capitalize">{viewItem.type.replace('_', ' ')}</Badge></div></div>
                <div className="space-y-1 text-right"><Label className="text-xs text-muted-foreground uppercase">Recipient</Label><div>{viewItem.userId === 'all' ? <Badge variant="outline" className="border-primary text-primary font-bold">BROADCAST</Badge> : <div className="text-sm font-medium"><p>{users?.find(u => u.id === viewItem.userId)?.name || 'User'}</p><p className="text-xs text-muted-foreground">{users?.find(u => u.id === viewItem.userId)?.email || viewItem.userId}</p></div>}</div></div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Scheduled At</Label><p className="text-sm">{viewItem.scheduledAt ? format(parseISO(viewItem.scheduledAt as any), 'MMM d, yyyy h:mm a') : 'Immediate'}</p></div>
                <div className="space-y-1 text-right"><Label className="text-xs text-muted-foreground uppercase flex items-center gap-1 justify-end"><Clock className="h-3 w-3" /> Created At</Label><p className="text-sm">{viewItem.createdAt ? format(parseISO(viewItem.createdAt as any), 'MMM d, yyyy h:mm a') : 'N/A'}</p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            {viewItem && <Button onClick={() => { handleResend(viewItem); setIsViewOpen(false); }}><RefreshCcw className="mr-2 h-4 w-4" />Resend Now</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
