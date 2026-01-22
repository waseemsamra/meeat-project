
'use client';

import { useMemo, useState } from 'react';
import { DateRange } from "react-day-picker";
import { addDays, format, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection, useFirestore } from '@/firebase';
import { collection, collectionGroup, query } from 'firebase/firestore';
import type { Product, InventoryLot, Order } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { PrintableReport } from '../PrintableReport';
import { ColumnDef } from '@tanstack/react-table';
import printJS from 'print-js';


const convertToKg = (quantity: number, unit: string): number => {
    if (!unit) return 0;
    const lowerUnit = unit.toLowerCase();
    const weightMatch = lowerUnit.match(/(\d+(\.\d+)?)/);
    const weight = weightMatch ? parseFloat(weightMatch[0]) : 1;
    
    if (lowerUnit.includes('kg')) return quantity * weight;
    if (lowerUnit.includes('lb')) return quantity * weight * 0.453592;
    if (lowerUnit.includes('oz')) return quantity * weight * 0.0283495;
    if (lowerUnit.includes('g')) return quantity * weight * 0.001;
    
    return 0; 
};


export default function StockStatusReportPage() {
  const firestore = useFirestore();
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -7)),
    to: endOfDay(new Date()),
  });
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [showReport, setShowReport] = useState(false);

  const productsQuery = useMemo(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const inventoryLotsQuery = useMemo(() => firestore ? collection(firestore, 'inventoryLots') : null, [firestore]);
  const { data: inventoryLots, isLoading: isLoadingInventoryLots } = useCollection<InventoryLot>(inventoryLotsQuery);
  
  const ordersQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'orders')) : null, [firestore]);
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const isLoading = isLoadingProducts || isLoadingInventoryLots || isLoadingOrders;

  const handleViewReport = () => {
    if (!products || !inventoryLots || !orders || !date?.from) {
        setReportData([]);
        setShowReport(true);
        return;
    };
    
    const startDate = startOfDay(date.from);
    const endDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    const reportMap = new Map<string, { product: Product, openingNo: number; openingKg: number; inNo: number; inKg: number; outNo: number; outKg: number; }>();

    products.forEach(p => {
        reportMap.set(p.id, { product: p, openingNo: 0, openingKg: 0, inNo: 0, inKg: 0, outNo: 0, outKg: 0 });
    });

    inventoryLots.forEach(lot => {
        const lotShipmentDate = new Date(lot.shipmentDate);
        if (lotShipmentDate < startDate) {
            const entry = reportMap.get(lot.productId);
            if (entry) {
                entry.openingNo += lot.quantity;
                entry.openingKg += convertToKg(lot.quantity, lot.unit);
            }
        }
    });
    
    orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        if (orderDate < startDate) {
            order.orderItemIds.forEach(item => {
                const entry = reportMap.get(item.productId);
                if (entry) {
                    entry.openingNo -= item.quantity;
                    entry.openingKg -= convertToKg(item.quantity, item.selectedUnit || '');
                }
            });
        }
    });
    
    inventoryLots.forEach(lot => {
        const lotShipmentDate = new Date(lot.shipmentDate);
        if (lotShipmentDate >= startDate && lotShipmentDate <= endDate) {
            const entry = reportMap.get(lot.productId);
            if (entry) {
                entry.inNo += lot.quantity;
                entry.inKg += convertToKg(lot.quantity, lot.unit);
            }
        }
    });
    
    orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        if (orderDate >= startDate && orderDate <= endDate) {
            order.orderItemIds.forEach(item => {
                const entry = reportMap.get(item.productId);
                if (entry) {
                    entry.outNo += item.quantity;
                    entry.outKg -= convertToKg(item.quantity, item.selectedUnit || '');
                }
            });
        }
    });

    const formattedData = Array.from(reportMap.values()).map(entry => ({
      productName: entry.product.name,
      openingNo: entry.openingNo.toFixed(0),
      openingKg: entry.openingKg.toFixed(2),
      inNo: entry.inNo.toFixed(0),
      inKg: entry.inKg.toFixed(2),
      outNo: entry.outNo.toFixed(0),
      outKg: entry.outKg.toFixed(2),
      closingNo: (entry.openingNo + entry.inNo - entry.outNo).toFixed(0),
      closingKg: (entry.openingKg + entry.inKg - entry.outKg).toFixed(2),
    }));

    setReportData(formattedData);
    setShowReport(true);
  };

   const reportColumns: ColumnDef<any>[] = [
    { accessorKey: 'productName', header: 'Product Name' },
    { accessorKey: 'openingNo', header: 'Opening (No)' },
    { accessorKey: 'openingKg', header: 'Opening (KG)' },
    { accessorKey: 'inNo', header: 'In (No)' },
    { accessorKey: 'inKg', header: 'In (KG)' },
    { accessorKey: 'outNo', header: 'Out (No)' },
    { accessorKey: 'outKg', header: 'Out (KG)' },
    { accessorKey: 'closingNo', header: 'Closing (No)' },
    { accessorKey: 'closingKg', header: 'Closing (KG)' },
  ];

   const handlePrint = () => {
    printJS({
        printable: 'printable-report',
        type: 'html',
        scanStyles: true,
        documentTitle: 'Stock Status Report',
        targetStyles: ['*'],
        style: `@page { size: A4 landscape; margin: 0; } body { -webkit-print-color-adjust: exact; margin: 20px !important; }`
    })
  }

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold">Stock Status Report</h1>
        <p className="text-muted-foreground">
          A summary of inventory levels and movement for a selected date range.
        </p>
      </div>
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>
                        Select your criteria and click "View Report".
                    </CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                            date.to ? (
                                <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pick a date</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleViewReport} disabled={isLoading}>View Report</Button>
                </div>
            </div>
        </CardHeader>
        {showReport && (
            <CardContent>
                {reportData && (
                    <>
                        <div className="flex justify-end mb-4">
                            <Button onClick={handlePrint} variant="outline">
                                <Printer className="mr-2 h-4 w-4" /> Print Report
                            </Button>
                        </div>
                        <div className="hidden">
                            <PrintableReport 
                                title="Stock Status Report"
                                dateRange={date}
                                columns={reportColumns}
                                data={reportData}
                                multiRowHeader={true}
                            />
                        </div>
                    </>
                )}
                 <PrintableReport 
                    columns={reportColumns}
                    data={reportData || []}
                    isLoading={isLoading}
                    isEmbedded={true}
                    multiRowHeader={true}
                />
            </CardContent>
        )}
      </Card>
    </div>
  );
}
