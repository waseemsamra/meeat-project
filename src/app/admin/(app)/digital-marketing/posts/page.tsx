
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, deleteDoc, orderBy, query, updateDoc } from 'firebase/firestore';
import type { SocialPost } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ClipboardCopy, Trash2, Facebook, Instagram, Eye, MoreHorizontal, Heart, MessageCircle, Send, Bookmark, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MeeatLogo } from '@/components/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getPlaceholderImage } from '@/lib/utils';
import { FirebaseError } from 'firebase/app';

function PostRowSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-16 w-16 rounded-md" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-4 w-2/3 mt-2" />
            </TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
             <TableCell><Skeleton className="h-5 w-8" /></TableCell>
            <TableCell><div className="flex justify-end"><Skeleton className="h-8 w-8" /></div></TableCell>
        </TableRow>
    )
}

const PlatformIcon = ({ platform }: { platform: SocialPost['platform']}) => {
    if (platform === 'Facebook') {
        return <Facebook className="h-5 w-5 text-blue-600" />;
    }
    if (platform === 'Instagram') {
        return <Instagram className="h-5 w-5 text-pink-600" />;
    }
    return null;
}

const editPostSchema = z.object({
  postText: z.string().min(1, "Post text cannot be empty."),
  imageUrl: z.string().min(1, "Image URL cannot be empty."),
});

type EditPostFormValues = z.infer<typeof editPostSchema>;

export default function GeneratedPostsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<SocialPost | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [postToPreview, setPostToPreview] = useState<SocialPost | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<SocialPost | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const form = useForm<EditPostFormValues>({
    resolver: zodResolver(editPostSchema),
  });

  const imageUrlForPreview = form.watch('imageUrl');

  const postsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'socialPosts'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: posts, isLoading } = useCollection<SocialPost>(postsQuery);

  const copyPostToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };
  
  const handleOpenAlert = (post: SocialPost) => {
    setPostToDelete(post);
    setIsAlertOpen(true);
  };
  
  const handleOpenPreview = (post: SocialPost) => {
    setPostToPreview(post);
    setIsPreviewOpen(true);
  };

  const handleOpenEdit = (post: SocialPost) => {
    setPostToEdit(post);
    form.reset({
        postText: post.postText,
        imageUrl: post.imageUrl,
    });
    setIsEditOpen(true);
  };

  const handleDelete = async () => {
    if (!firestore || !postToDelete) return;
    try {
        const docRef = doc(firestore, 'socialPosts', postToDelete.id);
        await deleteDoc(docRef);
        toast({ title: 'Success', description: 'Post deleted.' });
    } catch(e: any) {
        if (e instanceof FirebaseError && e.code === 'permission-denied') {
            const contextualError = await FirestorePermissionError.create({ path: `socialPosts/${postToDelete.id}`, operation: 'delete'});
            errorEmitter.emit('permission-error', contextualError);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete post.' });
        }
    } finally {
        setIsAlertOpen(false);
        setPostToDelete(null);
    }
  };

  const onEditSubmit = async (data: EditPostFormValues) => {
    if (!firestore || !postToEdit) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'An unexpected error occurred.'});
      return;
    }

    form.formState.isSubmitting;
    const postRef = doc(firestore, 'socialPosts', postToEdit.id);
    const dataToUpdate = {
        postText: data.postText,
        imageUrl: data.imageUrl,
    };

    try {
      await updateDoc(postRef, dataToUpdate);
      toast({ title: 'Post Updated', description: 'Your changes have been saved.' });
      setIsEditOpen(false);
    } catch (error) {
      console.error("Update failed:", error);
      const contextualError = await FirestorePermissionError.create({
          path: postRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
      });
      errorEmitter.emit('permission-error', contextualError);
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Generated Social Media Posts</h1>
          <p className="text-muted-foreground">
            A history of all AI-generated posts for your products.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Post History</CardTitle>
             <CardDescription>
                Review, copy, or delete previously generated content.
             </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Post Text</TableHead>
                  <TableHead>Generated On</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({length: 5}).map((_, i) => <PostRowSkeleton key={i} />)}
                {!isLoading && posts?.slice(0, visibleCount).map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <Image 
                        src={getPlaceholderImage(post.imageUrl)}
                        alt={post.productName}
                        width={64}
                        height={64}
                        className="rounded-md object-contain bg-muted"
                        unoptimized={post.imageUrl.startsWith('data:image')}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{post.productName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-pre-line max-w-md line-clamp-3">{post.postText}</TableCell>
                    <TableCell>{format(new Date(post.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                        <PlatformIcon platform={post.platform} />
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleOpenPreview(post)}>
                                    <Eye className="mr-2 h-4 w-4" /> Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenEdit(post)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copyPostToClipboard(post.postText)}>
                                    <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Text
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenAlert(post)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                 {!isLoading && (!posts || posts.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No posts have been generated yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
            {!isLoading && posts && posts.length > visibleCount && (
                <CardFooter className="flex justify-center border-t pt-6">
                    <Button onClick={() => setVisibleCount(prev => prev + 20)}>View More</Button>
                </CardFooter>
            )}
        </Card>
      </div>

       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this social media post from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post Preview</DialogTitle>
            <DialogDescription>
              A preview of the generated post for &quot;{postToPreview?.productName}&quot;.
            </DialogDescription>
          </DialogHeader>
          {postToPreview && (
            <div className="mt-4 border bg-background rounded-lg overflow-hidden">
                {/* Mock Post Header */}
                <div className="flex items-center gap-3 p-3 border-b">
                    <Avatar className="h-8 w-8">
                        <MeeatLogo />
                    </Avatar>
                    <span className="font-semibold text-sm">Me'eat</span>
                </div>
                {/* Post Image */}
                <div className="relative aspect-square bg-muted">
                    <Image 
                        src={getPlaceholderImage(postToPreview.imageUrl)} 
                        alt={postToPreview.productName} 
                        fill 
                        className="object-contain" 
                        unoptimized={postToPreview.imageUrl.startsWith('data:image')} 
                    />
                </div>
                <div className="p-3">
                    {/* Mock Action Icons */}
                    <div className="flex items-center gap-4 mb-2">
                        <Heart className="h-6 w-6" />
                        <MessageCircle className="h-6 w-6" />
                        <Send className="h-6 w-6" />
                        <Bookmark className="h-6 w-6 ml-auto" />
                    </div>
                     {/* Mock Likes */}
                    <div className="text-sm font-semibold mb-2">
                        Liked by 4,321 others
                    </div>
                    {/* Post Text */}
                    <div className="text-sm whitespace-pre-line">
                        <span className="font-semibold">Me'eat</span>
                        <span className="ml-1">{postToPreview.postText}</span>
                    </div>
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Social Post</DialogTitle>
            <DialogDescription>
              Update the text and image URL for this post.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="postText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Text</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={10}
                        className="resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="/posts/my-image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {imageUrlForPreview && (
                <div className="mt-4">
                  <FormLabel>Image Preview</FormLabel>
                  <div className="mt-2 p-2 border rounded-md w-48 h-48 flex items-center justify-center bg-muted">
                    <Image
                      src={getPlaceholderImage(imageUrlForPreview)}
                      alt="Image Preview"
                      width={180}
                      height={180}
                      className="object-contain"
                      unoptimized // Important for dynamic internal URLs
                      onError={(e) => {
                        // Hide the preview on error
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={(e) => {
                        e.currentTarget.style.display = 'block';
                      }}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
