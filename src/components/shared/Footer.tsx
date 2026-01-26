
'use client';

import Link from "next/link";
import { MeeatLogo } from "../icons";
import { useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/utils';
import { useMemo, useState, useEffect } from "react";

const footerLinks = [
    {
        title: "Shop By Cuts",
        links: [
            { href: "/products?search=Steaks", label: "Steaks" },
            { href: "/products?search=Bone-in%20Cubes", label: "Bone-in Cubes" },
            { href: "/products?search=Boneless%20Cubes", label: "Boneless Cubes" },
            { href: "/products?search=Mince", label: "Mince" },
            { href: "/products?search=Brisket", label: "Brisket" },
            { href: "/products?search=Beef%20Roast", label: "Beef Roast" },
            { href: "/products?search=Ribs", label: "Ribs" },
            { href: "/products?search=Beef%20Stroganoff", label: "Beef Stroganoff" },
            { href: "/products?search=Mishkak%20Cubes", label: "Mishkak Cubes" },
            { href: "/products?search=Thin%20Beef%20Slices", label: "Thin Beef Slices" },
            { href: "/products?search=Beef%20Burger%20Patties", label: "Beef Burger Patties" },
            { href: "/products?search=Sausages", label: "Sausages" },
            { href: "/products?category=Beef", label: "All Beef" },
        ],
    },
    {
        title: "Shop By Origin",
        links: [
            { href: "/products?countryOfOrigin=South%20Africa", label: "South African Grass-fed Beef" },
            { href: "/products?countryOfOrigin=Brazil", label: "Brazilian Grass-fed Beef" },
            { href: "/products?countryOfOrigin=Australia", label: "AUS Grass-fed Beef" },
            { href: "/products?countryOfOrigin=New%20Zealand", label: "NZ Grass-fed Beef" },
            { href: "/products?countryOfOrigin=Australia&grade=Black%20Angus", label: "Australian Black Angus Beef" },
            { href: "/products?countryOfOrigin=Australia&grade=Wagyu", label: "Australian Wagyu Beef" },
            { href: "/products?countryOfOrigin=USA&grade=Black%20Angus", label: "US Black Angus Beef" },
            { href: "/products?countryOfOrigin=Pakistan", label: "Pakistani Beef" },
            { href: "/products?countryOfOrigin=Japan&grade=A5%20Wagyu", label: "Japanese A5 Wagyu Beef" },
            { href: "/products?search=Seasoned", label: "Seasoned Beef" },
        ],
    },
    {
        title: "AUS Wagyu",
        links: [
            { href: "/products?countryOfOrigin=Australia&grade=Wagyu&search=MB%204/5", label: "Australian Wagyu Beef MB 4/5" },
            { href: "/products?countryOfOrigin=Australia&grade=Wagyu&search=MB%206/7", label: "Australian Wagyu Beef MB 6/7" },
            { href: "/products?countryOfOrigin=Australia&grade=Wagyu&search=MB%208/9", label: "Australian Wagyu Beef MB 8/9" },
        ],
    },
    {
        title: "Shop Whole Cuts",
        links: [
            { href: "/products?cutType=Beef%20Brisket&search=Whole", label: "Beef Brisket Whole Cuts" },
            { href: "/products?cutType=Bone-In%20Beef&search=Whole", label: "Bone-In Beef Whole Cuts" },
            { href: "/products?cutType=Boneless%20Beef&search=Whole", label: "Boneless Beef Whole Cuts" },
        ],
    },
];

export function Footer() {
    const [isClient, setIsClient] = useState(false);
    const firestore = useFirestore();
    const brandingRef = useMemo(() => firestore ? doc(firestore, 'settings', 'branding') : null, [firestore]);
    const { data: brandingSettings } = useDoc<{ logoUrl: string }>(brandingRef);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return (
        <footer className="border-t bg-card">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                    <div className="col-span-2 lg:col-span-1">
                        <Link href="/" className="flex items-center space-x-2 mb-4">
                           {isClient && brandingSettings?.logoUrl ? (
                                <Image src={getPlaceholderImage(brandingSettings.logoUrl)} alt="Me'eat Logo" width={120} height={48} className="h-12 w-auto" unoptimized />
                            ) : (
                                <MeeatLogo className="h-12 w-auto" />
                            )}
                        </Link>
                        <p className="text-sm text-muted-foreground">The finest quality beef and lamb, delivered to your door.</p>
                    </div>

                    {footerLinks.map((section, index) => (
                        <div key={`${section.title}-${index}`}>
                            <h3 className="font-headline text-md font-semibold mb-4">{section.title}</h3>
                            <ul className="space-y-2">
                                {section.links.map((link) => (
                                    <li key={`${link.href}-${link.label}`}>
                                        <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center">
                    <p className="text-sm text-muted-foreground">&copy; {isClient ? new Date().getFullYear() : '2024'} Me'eat. All rights reserved.</p>
                    {/* Placeholder for social links */}
                    <div className="flex space-x-4 mt-4 sm:mt-0">
                        {/* Icons would go here */}
                    </div>
                </div>
            </div>
        </footer>
    );
}
