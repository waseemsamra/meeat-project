
'use client';

import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductRowSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-5 w-5" /></TableCell>
            <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-16 w-16 rounded-md" />
            </TableCell>
            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell>
                <div className="flex justify-end">
                    <Skeleton className="h-8 w-8" />
                </div>
            </TableCell>
        </TableRow>
    )
}
