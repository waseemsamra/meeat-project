
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, BarChart2, Package, Users, ShoppingCart, Calculator } from "lucide-react";
import Link from 'next/link';

const reports = [
    {
        title: "Sales Report",
        description: "Analyze sales trends, revenue, and order volume.",
        href: "/admin/reporting/sales",
        icon: <BarChart2 className="h-6 w-6 text-primary" />,
    },
    {
        title: "Orders Report",
        description: "Filter and view orders by date and status.",
        href: "/admin/reporting/orders",
        icon: <ShoppingCart className="h-6 w-6 text-primary" />,
    },
    {
        title: "Products Report",
        description: "Filter and view products by various criteria.",
        href: "/admin/reporting/products",
        icon: <Package className="h-6 w-6 text-primary" />,
    },
    {
        title: "Stock Status Report",
        description: "View inventory levels, stock movement, and balances.",
        href: "/admin/reporting/stock-status",
        icon: <Package className="h-6 w-6 text-primary" />,
    },
    {
        title: "Customer Report",
        description: "See customer lifetime value and order history.",
        href: "/admin/reporting/customers",
        icon: <Users className="h-6 w-6 text-primary" />,
    },
     {
        title: "Cut Type Report",
        description: "View and filter cut types by various criteria.",
        href: "/admin/reporting/cut-types",
        icon: <Package className="h-6 w-6 text-primary" />,
    },
     {
        title: "Butchery Calculator",
        description: "Analyze carcass yield and profitability.",
        href: "/admin/settings/butchery-calculator",
        icon: <Calculator className="h-6 w-6 text-primary" />,
    },
]

export default function ReportingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Reporting</h1>
        <p className="text-muted-foreground">
          Gain insights into your business performance.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.title} className={`hover:shadow-lg transition-shadow`}>
            <Link href={report.href} className={`flex flex-col h-full`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{report.title}</CardTitle>
                  <CardDescription className="mt-1">{report.description}</CardDescription>
                </div>
                {report.icon}
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="flex items-center text-sm font-semibold text-primary">
                    <span>View Report</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
