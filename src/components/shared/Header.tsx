
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MeeatLogo } from '../icons';
import { User, Menu, Search, Heart, ShoppingCart, LogOut, Shield, Globe, Sparkles } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useUser, useAuth, useDoc, useFirestore, useCollection } from '@/firebase';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import { doc, collection } from 'firebase/firestore';
import type { Product, Currency, Language } from '@/lib/types';
import { Card } from '../ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Label } from '../ui/label';
import { suggestCurrency } from '@/ai/flows/suggest-currency';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from '@/hooks/useTranslation';

const mainNav = [
  { href: '/', label: 'HOME' },
  { href: '/products', label: 'PRODUCTS' },
  { href: '/about', label: 'ABOUT US' },
  { href: '/contact', label: 'CONTACT' },
];

const MobileNavLink = ({ href, children, onNavigate }: { href: string; children: React.ReactNode; onNavigate: () => void; }) => {
  return (
    <Link href={href} passHref>
      <Button variant="ghost" className="w-full justify-start" onClick={onNavigate}>
        {children}
      </Button>
    </Link>
  );
}

export function Header() {
  const { cartCount, cartTotal } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { language, setLanguage, currency, setCurrency } = useLanguage();
  const [tempLanguage, setTempLanguage] = useState(language);
  const [tempCurrency, setTempCurrency] = useState(currency);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const firestore = useFirestore();

  const brandingRef = useMemo(() => firestore ? doc(firestore, 'settings', 'branding') : null, [firestore]);
  const { data: brandingSettings } = useDoc<{ logoUrl: string }>(brandingRef);
  
  const productsQuery = useMemo(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsQuery);
  
  const currenciesQuery = useMemo(() => firestore ? collection(firestore, 'currencies') : null, [firestore]);
  const { data: currencies } = useCollection<Currency>(currenciesQuery);
  
  const languagesQuery = useMemo(() => firestore ? collection(firestore, 'languages') : null, [firestore]);
  const { data: languages } = useCollection<Language>(languagesQuery);

  const userIsAdmin = user?.roles?.includes('ADMIN');

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (searchQuery !== currentSearch) {
      setSearchQuery(currentSearch);
    }
  }, [searchParams, searchQuery]);

  useEffect(() => {
    if (searchQuery.length >= 3 && products) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [searchQuery, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    if (auth) {
      auth.signOut().then(() => {
        router.push('/');
      });
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/products?search=${searchQuery.trim()}`);
    setIsSearchFocused(false);
  };
  
  const handleProductSuggestionClick = () => {
    setIsSearchFocused(false);
    setFilteredProducts([]);
  };

  const handleLanguageChange = async (newLanguageName: string) => {
    const selectedLangObject = languages?.find(l => l.name === newLanguageName);
    if (!selectedLangObject) return;

    setTempLanguage(selectedLangObject);
    setIsSuggesting(true);
    try {
      const result = await suggestCurrency({ language: newLanguageName });
      const suggestedCode = result.currencyCode;
      
      const currencyExists = currencies?.some(c => c.code === suggestedCode);
      if (currencyExists) {
        setTempCurrency(suggestedCode);
        toast({ title: 'Currency Suggestion', description: `We've updated the currency to ${suggestedCode} for you.` });
      } else {
        toast({ variant: 'destructive', title: 'Currency Not Supported', description: `Our AI suggested ${suggestedCode}, but it's not currently supported in our store.` });
      }
    } catch (error) {
        console.error("Failed to suggest currency:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not get a currency suggestion.' });
    } finally {
        setIsSuggesting(false);
    }
  }

  const handleSettingsSave = () => {
    if (tempLanguage) {
      setLanguage(tempLanguage);
    }
    setCurrency(tempCurrency);
    setIsSettingsOpen(false);
  }

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <>
    <header className="sticky top-0 z-40 w-full bg-primary text-primary-foreground">
      <div className="container mx-auto flex h-24 items-center justify-between px-4 gap-8">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0">
          <Link href="/" className="flex items-center space-x-2">
             {brandingSettings?.logoUrl ? (
              <img src={brandingSettings.logoUrl} alt="Me'eat Logo" className="h-12 w-auto" />
            ) : (
              <MeeatLogo className="h-12 w-auto" />
            )}
          </Link>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-grow max-w-xl" ref={searchContainerRef}>
           <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Input
              type="search"
              placeholder={t('search_placeholder')}
              className="w-full rounded-full pl-10 pr-4 h-12 bg-white text-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
             {isSearchFocused && filteredProducts.length > 0 && (
              <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50">
                <ul>
                  {filteredProducts.map(product => (
                    <li key={product.id}>
                      <Link 
                        href={`/products/${product.slug}`} 
                        className="block p-3 hover:bg-muted text-foreground"
                        onClick={handleProductSuggestionClick}
                      >
                        {product.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </form>
        </div>

        {/* Desktop Icons */}
        <nav className="hidden md:flex items-center justify-end gap-1">
             <Button variant="ghost" className="flex items-center gap-2 text-xs" onClick={() => setIsSettingsOpen(true)}>
                <Globe className="h-5 w-5" /> {language.code} / {currency}
            </Button>
            
            <div className="h-8 border-l border-primary-foreground/20 mx-2"></div>

            {user ? (
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex-col h-auto px-2 py-1">
                        <Avatar className="h-7 w-7 mb-1 bg-primary-foreground text-primary">
                            <AvatarFallback>{userInitial}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">Account</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-foreground">
                    <DropdownMenuLabel>
                        <div className="font-normal">Signed in as</div>
                        <div className="font-semibold">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/account"><User className="mr-2 h-4 w-4" /> My Account</Link>
                    </DropdownMenuItem>
                    {userIsAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/dashboard"><Shield className="mr-2 h-4 w-4" /> Admin</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
                <Button asChild variant="ghost" className="flex-col h-auto px-2 py-1">
                    <Link href="/login">
                        <User className="h-6 w-6 mb-1" />
                        <span className="text-xs">Log In</span>
                    </Link>
                </Button>
            )}

            <Button variant="ghost" className="flex-col h-auto px-2 py-1">
              <div className="relative">
                <Heart className="h-6 w-6 mb-1" />
                <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">0</span>
              </div>
              <span className="text-xs">Wishlist</span>
            </Button>
          
            <Button asChild variant="ghost" className="flex-col h-auto px-2 py-1">
              <Link href="/cart">
                <div className="relative">
                  <ShoppingCart className="h-6 w-6 mb-1" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-xs">Cart: ${cartTotal.toFixed(2)}</span>
              </Link>
            </Button>
        </nav>

        {/* Mobile Menu Trigger */}
        <div className="flex md:hidden items-center gap-2">
           <Button asChild variant="ghost" size="icon" className="relative">
                <Link href="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {cartCount}
                    </span>
                  )}
                  <span className="sr-only">Shopping Cart</span>
                </Link>
            </Button>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle className='flex items-center gap-2'>
                  <MeeatLogo className="h-12 w-auto" />
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => { closeMobileMenu(); setIsSettingsOpen(true);}}>
                    <Globe className="mr-2 h-4 w-4" /> {language.code} / {currency}
                </Button>
                 <DropdownMenuSeparator className="my-4" />

                {mainNav.map((item) => (
                    <MobileNavLink key={item.label} href={item.href || '#'} onNavigate={closeMobileMenu}>
                      {item.label}
                    </MobileNavLink>
                ))}
                 <div className="border-t pt-4 space-y-2">
                    {user ? (
                        <>
                            <MobileNavLink href="/account" onNavigate={closeMobileMenu}>My Account</MobileNavLink>
                            {userIsAdmin && <MobileNavLink href="/admin/dashboard" onNavigate={closeMobileMenu}>Admin</MobileNavLink>}
                            <Button variant="ghost" className="w-full justify-start" onClick={() => { handleLogout(); closeMobileMenu(); }}>Logout</Button>
                        </>
                    ) : (
                        <MobileNavLink href="/login" onNavigate={closeMobileMenu}>Login</MobileNavLink>
                    )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>

     <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Update your settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">Language</Label>
                    <Select value={tempLanguage?.name} onValueChange={handleLanguageChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {languages?.map(lang => (
                                <SelectItem key={lang.id} value={lang.name}>{lang.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 relative">
                     <Label className="flex items-center gap-2">Currency</Label>
                     <Select value={tempCurrency} onValueChange={setTempCurrency}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {currencies?.map(c => (
                                <SelectItem key={c.id} value={c.code}>{c.name} ({c.symbol})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {isSuggesting && (
                         <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-md">
                            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Where applicable, prices will be converted and shown in the currency you select. The currency you pay in may differ based on your reservation.
                    </p>
                </div>
            </div>
            <DialogFooter>
                <Button className="w-full" onClick={handleSettingsSave}>Save</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
