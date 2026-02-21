
'use client';

import {
  Book,
  Home,
  LineChart,
  Package,
  Settings,
  ShoppingCart,
  Users2,
  Receipt,
  Truck,
  FileText,
  ChevronDown,
  Sparkles,
  Megaphone,
  Clapperboard,
  Calculator,
  Camera,
  Compass,
  Map as MapIcon,
  ClipboardList,
  Star,
  BarChart,
  Ruler,
  Bell,
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const navLinks = [
  {
    href: '/admin/dashboard',
    icon: Home,
    label: 'Dashboard',
  },
  {
    icon: ShoppingCart,
    label: 'Orders',
    subLinks: [
      { href: '/admin/orders/all', label: 'All Orders' },
      { href: '/admin/orders/sales', label: 'Sales Orders' },
      { href: '/admin/orders/new', label: 'New Sales Order' },
    ],
  },
  {
    icon: Package,
    label: 'Products',
    subLinks: [
      { href: '/admin/products/all', label: 'All Products' },
      { href: '/admin/products/new', label: 'Add New Product' },
    ],
  },
  {
    href: '/admin/inventory',
    icon: Book,
    label: 'Inventory',
  },
  {
    href: '/admin/vendors',
    icon: Users2,
    label: 'Vendors',
  },
  {
    icon: Receipt,
    label: 'Accounts',
    subLinks: [
        { href: '/admin/invoices', label: 'Invoices' },
        { href: '/admin/payments', label: 'Payments' },
        { href: '/admin/credit-notes', label: 'Credit Notes' },
        { href: '/admin/debit-notes', label: 'Debit Notes' },
    ],
  },
  {
    icon: Users2,
    label: 'Users',
    subLinks: [
      { href: '/admin/users/all', label: 'All Users' },
      { href: '/admin/users/online', label: 'Online Customers' },
      { href: '/admin/users/local', label: 'Local Customers' },
    ],
  },
  {
    href: '/admin/notifications',
    icon: Bell,
    label: 'Notifications',
  },
   {
    href: '/admin/reporting',
    icon: LineChart,
    label: 'Reporting',
    subLinks: [
      { href: '/admin/reporting/sales', label: 'Sales' },
      { href: '/admin/reporting/orders', label: 'Orders' },
      { href: '/admin/reporting/products', label: 'Products' },
      { href: '/admin/reporting/customers', label: 'Customers' },
      { href: '/admin/reporting/stock-status', label: 'Stock Status' },
      { href: '/admin/reporting/cut-types', label: 'Cut Types' },
    ],
  },
  {
    icon: FileText,
    label: 'Website Content',
    subLinks: [
      { href: '/admin/settings/home-hero', label: 'Home Hero' },
      { href: '/admin/settings/our-promise', label: 'Our Promise Section' },
      { href: '/admin/settings/branding', label: 'Branding' },
      { href: '/admin/settings/homepage-sections', label: 'Homepage Sections' },
      { href: '/admin/settings/explore-range', label: 'Explore Range Section', icon: Compass },
      { href: '/admin/settings/box-management', label: 'Box Management' },
      { href: '/admin/settings/choose-box-steps', label: 'Choose Box Steps' },
      { href: '/admin/real-cut-pic', label: 'Real Cut Pictures', icon: Camera },
      { href: '/admin/image-generation-test', label: 'Image Generation', icon: Sparkles },
      { href: '/admin/ai-video-generation', label: 'Video Generation', icon: Clapperboard },
    ],
  },
  {
    icon: Megaphone,
    label: 'Digital Marketing',
    subLinks: [
        { href: '/admin/digital-marketing/posts', label: 'Generated Posts' }
    ]
  }
];

const settingsLinks = [
   {
    icon: Settings,
    label: 'Settings',
    subLinks: [
        { href: '/admin/settings/groups', label: 'Groups' },
        { href: '/admin/settings/currencies', label: 'Currencies' },
        { href: '/admin/settings/languages', label: 'Languages' },
        { href: '/admin/settings/measurement-units', label: 'Measurement Units' },
        { href: '/admin/settings/categories', label: 'Categories' },
        { href: '/admin/settings/cut-types', label: 'Cut Types' },
        { href: '/admin/settings/grades', label: 'Grades' },
        { href: '/admin/settings/countries', label: 'Countries' },
        { href: '/admin/settings/styles', label: 'Styles' },
        { href: '/admin/settings/rubs', label: 'Rubs' },
        { href: '/admin/settings/temperatures', label: 'Temperatures' },
        { href: '/admin/settings/butchery-calculator', label: 'Butchery Calculator', icon: Calculator },
        { href: '/admin/settings/measuring-guide', label: 'Measuring Guide', icon: Ruler },
    ]
  }
];

const dispatchLinks = [
  {
    icon: Truck,
    label: 'Deliveries',
    subLinks: [
        { href: '#', label: 'Dispatch', icon: MapIcon },
        { href: '/admin/deliveries', label: 'Orders', icon: ClipboardList },
        { href: '#', label: 'Drivers', icon: Users2 },
        { href: '#', label: 'Map', icon: MapIcon },
        { href: '#', label: 'Review', icon: Star },
        { href: '#', label: 'Reports', icon: BarChart },
    ],
  }
];


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/admin/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = () => {
    if (auth) {
      auth.signOut().then(() => {
        router.push('/admin/login');
      });
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex h-screen w-full flex-col">
      <header 
        className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6"
      >
          <div className="flex-1">
             {/* Can add a toggle button here if needed */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                      <Avatar className="h-7 w-7 bg-primary text-primary-foreground">
                        <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/account">Go to Storefront</Link></DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <aside 
          className="hidden h-full w-60 flex-col border-r bg-background sm:flex"
        >
            <div className="flex-1 overflow-y-auto">
              <nav className="grid items-start p-4 text-sm font-medium">
              <TooltipProvider>
              {navLinks.map((link) =>
                  link.subLinks && link.subLinks.length > 0 ? (
                      <Collapsible key={link.label} className="w-full group">
                      <CollapsibleTrigger asChild>
                          <Button
                              variant="ghost"
                              className="w-full justify-start gap-2"
                          >
                          <link.icon className="h-5 w-5" />
                              {link.label}
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                          </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                          <div className="ml-7 flex flex-col gap-1 border-l pl-2 py-1">
                          {link.subLinks.map(subLink => (
                              <Link key={subLink.label} href={subLink.href} passHref>
                              <Button
                                  variant={pathname === subLink.href ? "secondary" : "ghost"}
                                  className="w-full justify-start text-sm h-8"
                                  >
                                  {subLink.icon && <subLink.icon className="h-4 w-4 mr-2" />}
                                  {subLink.label}
                                  </Button>
                              </Link>
                          ))}
                          </div>
                      </CollapsibleContent>
                      </Collapsible>
                  ) : (
                  <Tooltip key={link.label}>
                      <TooltipTrigger asChild>
                      <Link
                          href={link.href!}
                          className={cn(
                              "flex h-9 w-full justify-start items-center gap-2 rounded-lg px-3 text-muted-foreground transition-colors hover:text-foreground md:h-8",
                              pathname === link.href && "bg-accent text-accent-foreground"
                          )}
                      >
                          <link.icon className="h-5 w-5" />
                          <span>{link.label}</span>
                      </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{link.label}</TooltipContent>
                  </Tooltip>
                  )
              )}
              <Separator className="my-4" />
              {settingsLinks.map((link) => (
                  <Collapsible key={link.label} className="w-full group" defaultOpen={false}>
                      <CollapsibleTrigger asChild>
                          <Button
                          variant="ghost"
                          className="w-full justify-start gap-2"
                          >
                          <link.icon className="h-5 w-5" />
                          {link.label}
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                          </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                      <div className="ml-7 flex flex-col gap-1 border-l pl-2 py-1">
                          {link.subLinks.map(subLink => (
                          <Link key={subLink.label} href={subLink.href} passHref>
                              <Button
                                  variant={pathname === subLink.href ? "secondary" : "ghost"}
                                  className="w-full justify-start text-sm h-8"
                              >
                                  {subLink.icon && <subLink.icon className="h-4 w-4 mr-2" />}
                                  {subLink.label}
                              </Button>
                          </Link>
                          ))}
                      </div>
                      </CollapsibleContent>
                  </Collapsible>
              ))}
              <Separator className="my-4" />
              {dispatchLinks.map((link) => (
                  <Collapsible key={link.label} className="w-full group">
                      <CollapsibleTrigger asChild>
                          <Button
                          variant="ghost"
                          className="w-full justify-start gap-2"
                          >
                          <link.icon className="h-5 w-5" />
                          {link.label}
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                          </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                      <div className="ml-7 flex flex-col gap-1 border-l pl-2 py-1">
                          {link.subLinks.map(subLink => (
                          <Link key={subLink.label} href={subLink.href} passHref>
                              <Button
                                  variant={pathname === subLink.href ? "secondary" : "ghost"}
                                  className="w-full justify-start text-sm h-8"
                              >
                                  {subLink.icon && <subLink.icon className="h-4 w-4 mr-2" />}
                                  {subLink.label}
                              </Button>
                          </Link>
                          ))}
                      </div>
                      </CollapsibleContent>
                  </Collapsible>
              ))}
              </TooltipProvider>
              </nav>
            </div>
        </aside>
        
        <main 
          className="flex-1 overflow-y-auto p-4 sm:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
