
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { CutType, Category, Country, Product } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PrintableReport } from '../PrintableReport';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Printer, Calendar as CalendarIcon, View, Download } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay, endOfDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import printJS from 'print-js';


export default function CutTypesReportPage() {
  const firestore = useFirestore();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -365)),
    to: endOfDay(new Date()),
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const categoriesQuery = useMemo(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

  const countriesQuery = useMemo(() => firestore ? query(collection(firestore, 'countries')) : null, [firestore]);
  const { data: countries, isLoading: isLoadingCountries } = useCollection<Country>(countriesQuery);

  const cutTypesQuery = useMemo(() => firestore ? query(collection(firestore, 'cutTypes')) : null, [firestore]);
  const { data: cutTypes, isLoading: isLoadingCutTypes } = useCollection<CutType>(cutTypesQuery);

  const productsQuery = useMemo(() => firestore ? query(collection(firestore, 'products')) : null, [firestore]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const isLoading = isLoadingCategories || isLoadingCountries || isLoadingCutTypes || isLoadingProducts;

  const handleViewReport = () => {
    if (!cutTypes || !products || !date?.from) {
        setReportData([]);
        setShowReport(true);
        return;
    }
    
    const startDate = startOfDay(date.from);
    const endDate = date.to ? endOfDay(date.to) : endOfDay(new Date());

    let filteredProducts = products.filter(p => {
        const productDate = new Date(p.createdAt);
        return productDate >= startDate && productDate <= endDate;
    });

    if (selectedCountry !== 'all') {
        const countryName = countries?.find(c => c.id === selectedCountry)?.name;
        if (countryName) {
            filteredProducts = filteredProducts.filter(p => p.countryOfOrigin === countryName);
        }
    }

    const productCutTypeIds = new Set(filteredProducts.map(p => p.cutTypeId));

    let filteredCutTypes = [...cutTypes].filter(ct => productCutTypeIds.has(ct.id));

    if (selectedCategory !== 'all') {
        filteredCutTypes = filteredCutTypes.filter(ct => ct.categoryId === selectedCategory);
    }
    
    const data = filteredCutTypes.map(ct => ({
        name: ct.name,
        category: categories?.find(c => c.id === ct.categoryId)?.name || 'N/A',
        description: ct.description,
        slug: ct.slug,
    }));

    setReportData(data);
    setShowReport(true);
  };
  
  const reportColumns: ColumnDef<any>[] = [
    { accessorKey: 'name', header: 'Cut Type' },
    { accessorKey: 'slug', header: 'Slug' },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'description', header: 'Description' },
  ];

  const handlePrint = () => {
    printJS({
        printable: 'printable-report',
        type: 'html',
        scanStyles: true,
        documentTitle: 'Cut Types Report',
    });
  }
  
  return (
    <>
      <div className="space-y-8 no-print">
        <div>
          <h1 className="text-3xl font-bold">Cut Types Report</h1>
          <p className="text-muted-foreground">Filter and view cut types by category and country of origin.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Select your criteria and click "View Report".</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isLoadingCategories}>
                  <SelectTrigger className="w-full sm:w-auto">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={isLoadingCountries}>
                  <SelectTrigger className="w-full sm:w-auto">
                    <SelectValue placeholder="Filter by country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                  <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                      "w-full sm:w-[300px] justify-start text-left font-normal",
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
                <div className="flex justify-end gap-2 mb-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <View className="mr-2 h-4 w-4" />
                        Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {reportColumns.map((column) => {
                        const accessorKey = (column as any).accessorKey;
                        return (
                          <DropdownMenuCheckboxItem
                            key={accessorKey}
                            className="capitalize"
                            checked={columnVisibility[accessorKey] !== false}
                            onCheckedChange={(value) =>
                              setColumnVisibility(prev => ({ ...prev, [accessorKey]: !!value }))
                            }
                          >
                            {accessorKey.replace(/([A-Z])/g, ' $1')}
                          </DropdownMenuCheckboxItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={() => setIsPreviewOpen(true)} variant="outline"><Printer className="mr-2 h-4 w-4" /> Print / Preview</Button>
                </div>
              )}
              <PrintableReport 
                  columns={reportColumns.filter(c => columnVisibility[(c as any).accessorKey] !== false)}
                  data={reportData || []}
                  isLoading={isLoading}
                  isEmbedded={true}
              />
            </CardContent>
          )}
        </Card>
      </div>

       <div className="hidden">
          <PrintableReport
            id="printable-report"
            title="Cut Types Report"
            dateRange={date}
            columns={reportColumns.filter(c => columnVisibility[(c as any).accessorKey] !== false)}
            data={reportData || []}
            isEmbedded={false}
          />
        </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Print Preview: Cut Types Report</DialogTitle>
            <DialogDescription>
              Review your report before printing. The final output may vary slightly based on your printer settings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto">
            <PrintableReport
              columns={reportColumns.filter(c => columnVisibility[(c as any).accessorKey] !== false)}
              data={reportData || []}
              isEmbedded={true}
            />
          </div>
          <DialogFooter className="no-print">
             <Button onClick={handlePrint} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download as PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
