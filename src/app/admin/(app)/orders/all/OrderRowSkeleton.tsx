'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

export function OrderRowSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32 mt-1" />
            </TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell>
                <div className="flex justify-end">
                    <Skeleton className="h-8 w-8" />
                </div>
            </TableCell>
        </TableRow>
    )
}
