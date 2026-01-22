
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Trash2, Search, Share2, ClipboardCopy, Loader2, Save, ArrowUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, doc, deleteDoc, writeBatch, setDoc } from "firebase/firestore";
import type { Product, InventoryLot, SocialPost, SocialPostPlatform } from "@/lib/types";
import { useState, useMemo } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getPlaceholderImage, cn } from "@/lib/utils";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type RowSelectionState, type SortingState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ProductRowSkeleton } from "./ProductRowSkeleton";
import { generateSocialMediaPostAction } from "../actions";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FirebaseError } from "firebase/app";
import { useTranslation } from "@/hooks/useTranslation";

export default function AdminProductsPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { t } = useTranslation();
    
    const [searchQuery, setSearchQuery] = useState("");
    const productsQuery = useMemo(() => 
        firestore ? collection(firestore, "products") : null
    , [firestore]);
    const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

    const lotsQuery = useMemo(() =>
      firestore ? collection(firestore, "inventoryLots") : null
    , [firestore]);
    const { data: allLots, isLoading: isLoadingLots } = useCollection<InventoryLot>(lotsQuery);

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [sorting, setSorting] = useState<SortingState>([]);
    const [visibleCount, setVisibleCount] = useState(20);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertType, setAlertType] = useState<'single' | 'selected' | 'all'>('single');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    
    // State for the share modal
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isGeneratingPost, setIsGeneratingPost] = useState(false);
    const [isSavingPost, setIsSavingPost] = useState(false);
    const [socialPost, setSocialPost] = useState<{ text: string, imageUrl: string, platform: SocialPostPlatform } | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<SocialPostPlatform>('Instagram');


    const productInventoryMap = useMemo(() => {
        const map = new Map<string, number>();
        if (!allLots) return map;
        
        allLots.forEach(lot => {
            const currentQty = map.get(lot.productId) || 0;
            map.set(lot.productId, currentQty + lot.quantity);
        });
        return map;
    }, [allLots]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        if (!searchQuery) return products;

        return products.filter(product => 
            t(product.name).toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [products, searchQuery, t]);

    const handleGeneratePost = async () => {
        if (!selectedProduct) return;
        
        setIsGeneratingPost(true);
        setSocialPost(null);

        const result = await generateSocialMediaPostAction({
            productName: t(selectedProduct.name),
            description: t(selectedProduct.description) || '',
            price: `$${selectedProduct.price.toFixed(2)}`,
            category: selectedProduct.category,
            platform: selectedPlatform,
        });
        
        setIsGeneratingPost(false);

        if (result.success && result.postText) {
             setSocialPost({
                text: result.postText,
                imageUrl: getPlaceholderImage(selectedProduct.images[0]),
                platform: selectedPlatform,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'AI Generation Failed',
                description: result.error || 'Could not generate the social media post.'
            });
        }
    };
    
    const handleShareClick = (product: Product) => {
        setSelectedProduct(product);
        setIsShareModalOpen(true);
        setSocialPost(null); // Reset previous post
    };
    
    const handleSavePost = async () => {
        if (!socialPost || !selectedProduct || !firestore) return;
        setIsSavingPost(true);

        const newPostRef = doc(collection(firestore, 'socialPosts'));
        const newPostData: Omit<SocialPost, 'id'> = {
            productId: selectedProduct.id,
            productName: t(selectedProduct.name),
            postText: socialPost.text,
            imageUrl: selectedProduct.images[0],
            platform: socialPost.platform,
            createdAt: new Date().toISOString(),
        };

        try {
            await setDoc(newPostRef, { ...newPostData, id: newPostRef.id });
            toast({ title: 'Post Saved!', description: 'The generated post has been saved.' });
            setIsShareModalOpen(false);
        } catch (error) {
            console.error("Save failed:", error);
            if (error instanceof FirebaseError && error.code === 'permission-denied') {
                const contextualError = await FirestorePermissionError.create({
                    path: newPostRef.path,
                    operation: 'create',
                    requestResourceData: newPostData,
                });
                errorEmitter.emit('permission-error', contextualError);
            } else {
                toast({ variant: 'destructive', title: 'Save Failed', description: 'An unexpected error occurred.' });
            }
        } finally {
            setIsSavingPost(false);
        }
    };
    
    const copyPostToClipboard = () => {
        if (socialPost) {
            navigator.clipboard.writeText(socialPost.text);
            toast({ title: 'Copied to clipboard!' });
        }
    }
    
    const columns: ColumnDef<Product>[] = useMemo(() => [
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          ),
          enableSorting: false,
          enableHiding: false,
        },
        {
            id: 'image',
            header: () => <span className="sr-only">Image</span>,
            cell: ({ row }) => {
                const product = row.original;
                return (
                     <div className="relative w-16 h-16 rounded-md bg-muted">
                     <Image
                      alt={t(product.name)}
                      className="aspect-square rounded-md object-contain"
                      fill
                      src={getPlaceholderImage(product.images[0])}
                      data-ai-hint={`${product.category.toLowerCase()} ${product.cutType.toLowerCase()}`}
                    />
                    </div>
                )
            }
        },
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row }) => <div className="font-medium">{t(row.original.name)}</div>
        },
        {
            accessorKey: 'cutType',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Cut Type
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const totalInventory = productInventoryMap.get(row.original.id) || 0;
                const isInStock = totalInventory > 0;
                return (
                    <Badge variant={isInStock ? "outline" : "destructive"}>
                      {isInStock ? "In Stock" : "Out of Stock"}
                    </Badge>
                )
            }
        },
        {
            id: 'inventory',
            header: 'Inventory',
            cell: ({ row }) => productInventoryMap.get(row.original.id) || 0,
        },
          {
          id: 'actions',
          cell: ({ row }) => {
            const product = row.original;
            return (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href={`/admin/products/${product.id}/edit`}>Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/admin/products/new?cloneFrom=${product.id}`}>Clone</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareClick(product)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => handleOpenAlert('single', product)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          },
        },
    ], [productInventoryMap, t]);

    const table = useReactTable({
        data: filteredProducts || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        onRowSelectionChange: setRowSelection,
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {
          rowSelection,
          sorting,
        },
    });

    const handleOpenAlert = (type: 'single' | 'selected' | 'all', product?: Product) => {
        setAlertType(type);
        if (product) setSelectedProduct(product);
        setIsAlertOpen(true);
    };

    const handleDelete = async () => {
        if (!firestore) return;
        
        let productIdsToDelete: string[] = [];
        let toastMessage = "";

        if (alertType === 'single' && selectedProduct) {
            productIdsToDelete = [selectedProduct.id];
            toastMessage = `Product "${t(selectedProduct.name)}" deleted.`;
        } else if (alertType === 'selected') {
            productIdsToDelete = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
            toastMessage = `${productIdsToDelete.length} products deleted.`;
        } else if (alertType === 'all') {
            productIdsToDelete = products?.map(p => p.id) || [];
            toastMessage = `All products deleted.`;
        }

        if (productIdsToDelete.length === 0) {
            toast({ variant: 'destructive', title: 'No products selected' });
            setIsAlertOpen(false);
            return;
        }

        try {
            const batch = writeBatch(firestore);
            productIdsToDelete.forEach(id => {
                const docRef = doc(firestore, 'products', id);
                batch.delete(docRef);
            });
            await batch.commit();
            toast({ title: 'Success', description: toastMessage });
        } catch(e: any) {
            console.error("Batch delete failed:", e);
            const contextualError = await FirestorePermissionError.create({ path: '/products', operation: 'delete' });
            errorEmitter.emit('permission-error', contextualError);
        } finally {
            setIsAlertOpen(false);
            setRowSelection({});
            setSelectedProduct(null);
        }
    };

    const isLoading = isLoadingProducts || isLoadingLots;
    const selectedCount = Object.keys(rowSelection).length;

  return (
    <>
    <div className="space-y-8">
        <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">Products</h1>
            <div className="flex-grow max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
            <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                    <Button variant="destructive" onClick={() => handleOpenAlert('selected')}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected ({selectedCount})
                    </Button>
                )}
                 <Button variant="destructive" onClick={() => handleOpenAlert('all')}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete All
                </Button>
                <Button asChild>
                    <Link href="/admin/products/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Product
                    </Link>
                </Button>
            </div>
        </div>
      
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                     <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({length: 5}).map((_, i) => <ProductRowSkeleton key={i} />)}
              {!isLoading && table.getRowModel().rows.slice(0, visibleCount).map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {!isLoading && table.getRowModel().rows.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                        {searchQuery ? "No products match your search." : "No products found."}
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {!isLoading && table.getRowModel().rows.length > visibleCount && (
            <CardFooter className="flex justify-center border-t pt-6">
                <Button onClick={() => setVisibleCount(prev => prev + 20)}>View More</Button>
            </CardFooter>
        )}
      </Card>

       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {alertType === 'single' && `This action cannot be undone. This will permanently delete the product "${t(selectedProduct?.name)}".`}
              {alertType === 'selected' && `This action cannot be undone. This will permanently delete the ${selectedCount} selected products.`}
              {alertType === 'all' && `This action cannot be undone. This will permanently delete ALL products.`}
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
    </div>
    
    <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Share "{t(selectedProduct?.name)}"</DialogTitle>
                <DialogDescription>
                    Generate and save a social media post for this product.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                    <div className="w-1/3 space-y-2">
                        <Label htmlFor="platform">Platform</Label>
                        <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as SocialPostPlatform)}>
                            <SelectTrigger id="platform">
                                <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Instagram">Instagram</SelectItem>
                                <SelectItem value="Facebook">Facebook</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleGeneratePost} disabled={isGeneratingPost} className="self-end">
                        {isGeneratingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                        {isGeneratingPost ? 'Generating...' : 'Generate Post'}
                    </Button>
                </div>

                {isGeneratingPost ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : socialPost ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                            <Image src={socialPost.imageUrl} alt={t(selectedProduct?.name)} fill className="object-contain" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <Textarea
                                readOnly
                                value={socialPost.text}
                                className="h-full w-full flex-grow text-sm"
                                rows={15}
                            />
                        </div>
                    </div>
                ) : null}
            </div>
             <DialogFooter>
                {socialPost && !isGeneratingPost && (
                    <div className="flex justify-end gap-2 w-full">
                        <Button variant="outline" onClick={copyPostToClipboard}>
                           <ClipboardCopy className="mr-2 h-4 w-4" /> Copy
                        </Button>
                        <Button onClick={handleSavePost} disabled={isSavingPost}>
                            {isSavingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isSavingPost ? 'Saving...' : 'Save to Collection'}
                        </Button>
                    </div>
                )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
