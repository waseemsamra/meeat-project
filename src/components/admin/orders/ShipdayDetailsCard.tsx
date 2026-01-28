
'use client';

import type { ShipdayOrderDetails } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Truck, Package, User, Clock, MapPin, FileText, CheckCircle } from 'lucide-react';

interface ShipdayDetailsCardProps {
    details: ShipdayOrderDetails | null;
    isLoading: boolean;
}

const DetailRow = ({ label, value }: { label: string; value?: string | number | null; }) => {
    if (!value) return null;
    return (
        <div className="grid grid-cols-2 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
        </div>
    );
};

const formatShipdayDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch {
        return dateString; // return original string if it's not a valid date
    }
};

const formatShipdayTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        // The API might return time only for requested times like "17:49:00"
        if (dateString.match(/^\d{2}:\d{2}:\d{2}$/)) {
            const today = new Date();
            const [hours, minutes, seconds] = dateString.split(':');
            today.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds, 10));
            return format(today, "h:mm a");
        }
        return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch {
        return dateString; // return original string if it's not a valid date
    }
};

export function ShipdayDetailsCard({ details, isLoading }: ShipdayDetailsCardProps) {

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Shipday Delivery Details</CardTitle>
                    <CardDescription>Loading live delivery status...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!details) {
        return null; // Don't render the card if there are no details (e.g., order not sent to Shipday)
    }
    
    let statusVariant: "default" | "secondary" | "outline" = "secondary";
    if (details.orderStatus === 'Delivered') {
        statusVariant = 'default';
    } else if (details.orderStatus === 'On the way') {
        statusVariant = 'outline';
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Shipday Delivery Details</CardTitle>
                <div className="flex items-center justify-between">
                    <CardDescription>Live delivery status and details from Shipday.</CardDescription>
                    <Badge variant={statusVariant} className="capitalize">{details.orderStatus}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> Deliver To</h4>
                        <div className="text-sm space-y-1 pl-6">
                            <p className="font-medium">{details.deliverTo?.name}</p>
                            <p className="text-muted-foreground">{details.deliverTo?.address}</p>
                            <p className="text-muted-foreground">{details.deliverTo?.phone}</p>
                            <p className="text-muted-foreground">{details.deliverTo?.email}</p>
                        </div>
                    </div>
                     <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> Pick-up From</h4>
                         <div className="text-sm space-y-1 pl-6">
                            <p className="font-medium">{details.pickupFrom?.name}</p>
                            <p className="text-muted-foreground">{details.pickupFrom?.address}</p>
                            <p className="text-muted-foreground">{details.pickupFrom?.phone}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Delivery Timeline</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm pl-6">
                        <DetailRow label="Order Placement Time" value={formatShipdayDate(details.delivery?.placementTime)} />
                        <DetailRow label="Requested Pickup Time" value={formatShipdayTime(details.delivery?.requestedPickupTime)} />
                        <DetailRow label="Requested Delivery Time" value={formatShipdayDate(details.delivery?.requestedDeliveryTime)} />
                        <DetailRow label="Order Accept Time" value={formatShipdayDate(details.delivery?.assignedTime)} />
                        <DetailRow label="Order Pickup Time" value={formatShipdayDate(details.delivery?.actualPickupTime)} />
                        <DetailRow label="Order Delivery Time" value={formatShipdayDate(details.delivery?.actualDeliveryTime)} />
                        <DetailRow label="Order Completion Time" value={details.delivery?.orderCompletionTime !== undefined ? `${details.delivery.orderCompletionTime} mins` : 'N/A'} />
                        <DetailRow label="Driver" value={details.delivery?.driver?.name} />
                    </div>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Instructions & Notes</h4>
                        <p className="text-sm text-muted-foreground pl-6">{details.delivery?.deliveryInstruction || 'No instructions provided.'}</p>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> Location & Proof</h4>
                        <div className="pl-6 space-y-2">
                             {details.deliveryLocation?.latitude && (
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${details.deliveryLocation.latitude},${details.deliveryLocation.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary underline"
                                >
                                    View Delivery Location on Map
                                </a>
                             )}
                             <p className="text-sm flex items-center gap-2">
                                {details.pod ? (
                                    <>
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span>Proof of Delivery: {details.pod}</span>
                                    </>
                                ) : (
                                    <span className="text-destructive">No Proof of Delivery taken.</span>
                                )}
                             </p>
                        </div>
                    </div>
                 </div>
            </CardContent>
        </Card>
    );
}
