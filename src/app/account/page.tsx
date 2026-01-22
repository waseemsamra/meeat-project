
"use client";

import { useUser } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

function AccountPageSkeleton() {
    return (
        <>
            <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-48" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-64" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-32" />
            </div>
        </>
    )
}

export default function AccountPage() {
    const { user, isUserLoading } = useUser();

    // The layout now handles the redirect, so we just need to show a loading state.
    if (isUserLoading || !user) {
        return (
            <div className="container mx-auto px-4 py-12">
                <h1 className="text-4xl font-bold font-headline mb-8">My Account</h1>
                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Account Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <AccountPageSkeleton />
                    </CardContent>
                </Card>
                 <div className="mt-8">
                    <Skeleton className="h-10 w-44" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold font-headline mb-8">My Account</h1>
            
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Account Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Name</p>
                            <p className="text-lg">{user.name}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Email</p>
                            <p className="text-lg">{user.email}</p>
                        </div>
                            <div>
                            <p className="text-sm font-medium text-muted-foreground">Role</p>
                            <p className="text-lg capitalize">{(user.roles?.[0] || 'Customer').toLowerCase()}</p>
                        </div>
                    </>
                </CardContent>
            </Card>

            <div className="mt-8">
                <Button asChild variant="outline">
                    <Link href="/account/orders">
                        View My Orders <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}
