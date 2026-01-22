'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Product, Category, Country, CutType, Grade, Attribute } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PrintableReport } from '../PrintableReport';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Printer, Calendar as CalendarIcon, View, Download, Loader2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay, endOfDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSettings } from '@/hooks/useSettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import printJS from 'print-js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ProductsReportPage() {
  const firestore = useFirestore();
  const { defaultCurrency } = useSettings();
  const currencySymbol = defaultCurrency?.symbol || '$';

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCutType, setSelectedCutType] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedTemperature, setSelectedTemperature] = useState('all');
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -365)),
    to: endOfDay(new Date()),
  });

  const [reportData, setReportData] = useState<any[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Data fetching
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(useMemo(() => firestore ? query(collection(firestore, 'products')) : null, [firestore]));
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(useMemo(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]));
  const { data: cutTypes, isLoading: isLoadingCutTypes } = useCollection<CutType>(useMemo(() => firestore ? query(collection(firestore, 'cutTypes')) : null, [firestore]));
  const { data: grades, isLoading: isLoadingGrades } = useCollection<Grade>(useMemo(() => firestore ? query(collection(firestore, 'grades')) : null, [firestore]));
  const { data: countries, isLoading: isLoadingCountries } = useCollection<Country>(useMemo(() => firestore ? query(collection(firestore, 'countries')) : null, [firestore]));
  const { data: temperatures, isLoading: isLoadingTemperatures } = useCollection<Attribute>(useMemo(() => firestore ? query(collection(firestore, 'temperatures')) : null, [firestore]));

  const isLoading = isLoadingProducts || isLoadingCategories || isLoadingCutTypes || isLoadingGrades || isLoadingCountries || isLoadingTemperatures;

  const handleViewReport = () => {
    if (!products || !date?.from) {
      setReportData([]);
      setShowReport(true);
      return;
    }
    
    const startDate = startOfDay(date.from);
    const endDate = date.to ? endOfDay(date.to) : endOfDay(new Date());

    const categoryIdMap = new Map(categories?.map(c => [c.name, c.id]));
    const cutTypeIdMap = new Map(cutTypes?.map(ct => [ct.name, ct.id]));
    const gradeIdMap = new Map(grades?.map(g => [g.name, g.id]));

    const filtered = products.filter(p => {
        const productDate = new Date(p.createdAt);
        const dateMatch = productDate >= startDate && productDate <= endDate;
        const categoryMatch = selectedCategory === 'all' || p.category === selectedCategory;
        const cutTypeMatch = selectedCutType === 'all' || p.cutTypeId === selectedCutType;
        const gradeMatch = selectedGrade === 'all' || p.gradeQuality === selectedGrade;
        const countryMatch = selectedCountry === 'all' || p.countryOfOrigin === selectedCountry;
        const temperatureMatch = selectedTemperature === 'all' || p.temperature === selectedTemperature;
        
        return dateMatch && categoryMatch && cutTypeMatch && gradeMatch && countryMatch && temperatureMatch;
    }).map(p => ({
        ...p,
        price: `${currencySymbol}${p.price.toFixed(2)}`,
        createdAt: format(new Date(p.createdAt), "LLL dd, y"),
    }));

    setReportData(filtered);
    setShowReport(true);
  };
  
  const reportColumns: ColumnDef<any>[] = [
    { accessorKey: 'name', header: 'Product Name' },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'cutType', header: 'Cut Type' },
    { accessorKey: 'price', header: 'Price' },
    { accessorKey: 'gradeQuality', header: 'Grade' },
    { accessorKey: 'countryOfOrigin', header: 'Country' },
    { accessorKey: 'temperature', header: 'Temp' },
    { accessorKey: 'createdAt', header: 'Created On' },
  ];

  const handlePrint = () => {
    printJS({
        printable: 'printable-preview',
        type: 'html',
        scanStyles: true,
        documentTitle: 'Products Report',
    });
  }

  const handleDownloadPdf = async () => {
    const reportElement = document.getElementById('printable-preview');
    if (!reportElement) return;
    setIsDownloading(true);

    try {
        const canvas = await html2canvas(reportElement, {
            scale: 2, // Increase resolution
            useCORS: true,
            backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        
        let finalWidth = pdfWidth;
        let finalHeight = finalWidth / ratio;
        
        if (finalHeight > pdfHeight) {
            finalHeight = pdfHeight;
            finalWidth = finalHeight * ratio;
        }

        const x = (pdfWidth - finalWidth) / 2;
        const y = (pdfHeight - finalHeight) / 2;

        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
        pdf.save('products-report.pdf');

    } catch (error) {
        console.error("Error generating PDF:", error);
    } finally {
        setIsDownloading(false);
    }
  };
  
  return (
    <>
      <div className="space-y-8 no-print">
        <div>
          <h1 className="text-3xl font-bold">Products Report</h1>
          <p className="text-muted-foreground">Filter and view products by various criteria.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Select your criteria and click "View Report".</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isLoadingCategories}>
                  <SelectTrigger className="w-full sm:w-auto min-w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Categories</SelectItem>{categories?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={selectedCutType} onValueChange={setSelectedCutType} disabled={isLoadingCutTypes}>
                  <SelectTrigger className="w-full sm:w-auto min-w-[150px]"><SelectValue placeholder="Cut Type" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Cut Types</SelectItem>{cutTypes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={selectedGrade} onValueChange={setSelectedGrade} disabled={isLoadingGrades}>
                  <SelectTrigger className="w-full sm:w-auto min-w-[150px]"><SelectValue placeholder="Grade" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Grades</SelectItem>{grades?.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={isLoadingCountries}>
                  <SelectTrigger className="w-full sm:w-auto min-w-[150px]"><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Countries</SelectItem>{countries?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={selectedTemperature} onValueChange={setSelectedTemperature} disabled={isLoadingTemperatures}>
                  <SelectTrigger className="w-full sm:w-auto min-w-[150px]"><SelectValue placeholder="Temperature" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Temps</SelectItem>{temperatures?.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                  <Button id="date" variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal",!date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
                  </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/></PopoverContent>
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
                    <DropdownMenuTrigger asChild><Button variant="outline"><View className="mr-2 h-4 w-4" />Columns</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {reportColumns.map((column) => {
                        const accessorKey = (column as any).accessorKey;
                        return (<DropdownMenuCheckboxItem key={accessorKey} className="capitalize" checked={columnVisibility[accessorKey] !== false} onCheckedChange={(value) => setColumnVisibility(prev => ({ ...prev, [accessorKey]: !!value }))}>
                            {accessorKey.replace(/([A-Z])/g, ' $1')}
                          </DropdownMenuCheckboxItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={() => setIsPreviewOpen(true)} variant="outline"><Printer className="mr-2 h-4 w-4" /> Print / Preview</Button>
                </div>
              )}
              <PrintableReport columns={reportColumns.filter(c => columnVisibility[(c as any).accessorKey] !== false)} data={reportData || []} isLoading={isLoading} isEmbedded={true} />
            </CardContent>
          )}
        </Card>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Print Preview: Products Report</DialogTitle>
            <DialogDescription>
              Review your report before printing. The final output may vary slightly based on your printer settings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-4 border rounded-md bg-white text-black">
            <div id="printable-preview">
                <PrintableReport
                    title="Products Report"
                    dateRange={date}
                    columns={reportColumns.filter(c => columnVisibility[(c as any).accessorKey] !== false)}
                    data={reportData || []}
                    isEmbedded={false}
                />
            </div>
          </div>
          <DialogFooter className="no-print">
            <Button onClick={handleDownloadPdf} variant="outline" disabled={isDownloading}>
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
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