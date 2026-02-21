
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, doc, setDoc } from 'firebase/firestore';
import type { Notification, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, User as UserIcon, Bell, Calendar, Clock, Megaphone, Info, RefreshCcw } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';

export default function NotificationSearchPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [viewItem, setViewItem] = useState<Notification | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Fetch users for the search dropdown
  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users || userSearchQuery.length < 2) return [];
    return users.filter(u => 
      u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    ).slice(0, 5);
  }, [users, userSearchQuery]);

  // Fetch notifications for the selected user OR broadcast notifications
  const notificationsQuery = useMemo(() => {
    if (!firestore || !selectedUser) return null;
    return query(
      collection(firestore, 'notifications'),
      where('userId', 'in', [selectedUser.id, 'ALL']),
      orderBy('scheduledAt', 'desc')
    );
  }, [firestore, selectedUser]);

  const { data: notifications, isLoading: isLoadingNotifications } = useCollection<Notification>(notificationsQuery);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setUserSearchQuery('');
  };

  const handleOpenView = (notification: Notification) => {
    setViewItem(notification);
    setIsViewOpen(true);
  };

  const handleResend = async (notification: Notification) => {
    if (!firestore) return;
    try {
        const { id, __path, createdAt, scheduledAt, ...cloneData } = notification as any;
        const resendData = {
            ...cloneData,
            createdAt: new Date().toISOString(),
            scheduledAt: new Date().toISOString(),
            read: false,
        };
        const docRef = doc(collection(firestore, 'notifications'));
        await setDoc(docRef, { ...resendData, id: docRef.id });
        toast({ 
            title: 'Notification Resent', 
            description: `"${notification.title}" has been sent again immediately.`,
        });
    } catch (e) {
        console.error("Resend error:", e);
        toast({ variant: 'destructive', title: 'Resend Failed', description: 'Could not resend notification.' });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Notification Search</h1>
        <p className="text-muted-foreground">Search for a user to view their personal and app-wide notification history.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target User Search</CardTitle>
          <CardDescription>Search by name or email to view related notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user..."
              className="pl-9"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
            />
            {filteredUsers.length > 0 && (
              <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-xl">
                <ScrollArea className="h-auto max-h-60">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-accent text-left transition-colors border-b last:border-0"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{user.name || 'No Name'}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </button>
                  ))}
                </ScrollArea>
              </Card>
            )}
          </div>

          {selectedUser && (
            <div className="mt-6 flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                {selectedUser.name?.charAt(0) || '?'}
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-lg">{selectedUser.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notification History
            </CardTitle>
            <CardDescription>
              Personal updates and broadcast messages for {selectedUser.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingNotifications ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full rounded-md" />
                ))}
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map(notification => {
                  const dateVal = notification.scheduledAt;
                  const date = dateVal ? (typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal)) : null;
                  const isBroadcast = notification.userId === 'ALL';
                  
                  return (
                    <div 
                      key={notification.id} 
                      onClick={() => handleOpenView(notification)}
                      className={`p-4 rounded-lg border flex flex-col md:flex-row gap-4 transition-all cursor-pointer hover:shadow-md ${
                        isBroadcast ? 'bg-primary/5 border-primary/20' : 'bg-background hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isBroadcast ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isBroadcast ? <Megaphone className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                        </div>
                      </div>
                      <div className="flex-grow space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm">{notification.title}</h4>
                          <Badge variant={notification.type === 'promotion' ? 'default' : 'secondary'} className="text-[10px] h-4">
                            {notification.type.replace('_', ' ')}
                          </Badge>
                          {isBroadcast && (
                            <Badge variant="outline" className="text-[10px] h-4 border-primary text-primary font-bold">
                              BROADCAST
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {notification.body}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-start md:items-end gap-1 border-t md:border-t-0 pt-2 md:pt-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {date && isValid(date) ? format(date, 'MMM d, yyyy') : 'N/A'}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {date && isValid(date) ? format(date, 'h:mm a') : 'N/A'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No matching notifications found for this user.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Notification Details
            </DialogTitle>
            <DialogDescription>
              Full record of the message sent to the mobile app.
            </DialogDescription>
          </DialogHeader>
          
          {viewItem && (
            <div className="space-y-6 pt-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Title</Label>
                <p className="text-lg font-bold font-headline">{viewItem.title}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Message Body</Label>
                <div className="p-4 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap border leading-relaxed">
                  {viewItem.body}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Category</Label>
                  <div>
                    <Badge variant={viewItem.type === 'promotion' ? 'default' : 'secondary'} className="capitalize">
                      {viewItem.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Recipient</Label>
                  <div>
                    {viewItem.userId === 'ALL' ? (
                      <Badge variant="outline" className="border-primary text-primary font-bold">BROADCAST</Badge>
                    ) : (
                      <div className="text-sm font-medium">
                        <p>{selectedUser?.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{selectedUser?.email || viewItem.userId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Scheduled At
                  </Label>
                  <p className="text-sm">
                    {viewItem.scheduledAt ? format(parseISO(viewItem.scheduledAt as any), 'MMM d, yyyy h:mm a') : 'Immediate'}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" /> Created At
                  </Label>
                  <p className="text-sm">
                    {viewItem.createdAt ? format(parseISO(viewItem.createdAt as any), 'MMM d, yyyy h:mm a') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            {viewItem && (
              <Button onClick={() => { handleResend(viewItem); setIsViewOpen(false); }}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Resend Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
