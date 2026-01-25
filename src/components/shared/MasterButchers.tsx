
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getPlaceholderImage } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CleaverIcon, CowIcon } from '../icons';
import { Box, Recycle, Truck } from 'lucide-react';
import Link from 'next/link';

const tabsData = [
  {
    id: 'master-butchers',
    title: 'MASTER BUTCHERS',
    icon: CleaverIcon,
    content: {
      title: 'MASTER BUTCHERS',
      description: [
        "Our meat, sausages, and bacon are hand-prepared by our award-winning team of master butchers in the finest traditions of British craft butchery.",
        "Our grass-fed meat is not only sourced from small, local farms with the highest standards of animal welfare, it is brought on by our team to produce really flavoursome, characterful meat.",
        "All our meat is finished using non-halal processes.",
        "Our beef is all dry-aged to tenderise and flavour the meat. By hanging a beef carcass on the bone in a chill store for 4 weeks or more, the meat ages naturally to lock in the great flavours you would expect from high-end beef, grass-fed beef. The process of dry-ageing enables moisture to evaporate and allows the beef's natural enzymes to break down the meat's tissues.",
        "It's a whole different ball-game to the wet-aged meat you will find predominantly in the supermarkets. With wet-ageing, the meat tenderises after it has been vacuum-packed and whilst it is being transported. Which is why you will notice wet-aged meat shrinking when you cook it as it can contain up to 30% water.",
        "As they say, good things take time."
      ],
      image: 'master-butcher-1',
      imageHint: 'butcher portrait',
      buttonText: 'SHOP NOW',
      buttonLink: '/products'
    }
  },
  {
    id: 'packaging',
    title: 'PACKAGING',
    icon: Box,
    content: {
      title: 'ECO-FRIENDLY PACKAGING',
      description: [
        "Our packaging is designed to be both highly effective at keeping your meat fresh and environmentally friendly. We use insulated boxes made from recycled materials and innovative gel packs that are non-toxic and reusable.",
        "Your meat is vacuum-sealed to lock in freshness and prevent freezer burn. This method also allows the meat to continue aging, further enhancing its flavor and tenderness right up until you're ready to cook it."
      ],
      image: 'packaging-1',
      imageHint: 'meat packaging',
      buttonText: 'LEARN MORE',
      buttonLink: '/about'
    }
  },
  {
    id: 'delivery',
    title: 'DELIVERY',
    icon: Truck,
    content: {
      title: 'FRESH, FAST DELIVERY',
      description: [
        "We offer fast and reliable delivery across the UAE. Your order is dispatched in our climate-controlled vans to ensure it arrives at your door in perfect condition.",
        "You can choose a delivery slot that suits you. We provide real-time tracking so you know exactly when to expect your delivery. Our goal is to get our premium meat from our shop to your kitchen as quickly and efficiently as possible."
      ],
      image: 'delivery-van-1',
      imageHint: 'delivery van',
      buttonText: 'VIEW DELIVERY INFO',
      buttonLink: '/contact'
    }
  },
  {
    id: 'ordering',
    title: 'ORDERING',
    icon: CowIcon,
    content: {
      title: 'SIMPLE & SECURE ORDERING',
      description: [
        "Ordering from Me'eat is simple. Browse our selection, choose your cuts, and head to our secure checkout. We accept all major credit cards and offer a variety of payment options.",
        "You can create an account to save your details for faster checkout next time, or check out as a guest. Your personal and payment information is always kept secure."
      ],
      image: 'online-ordering-1',
      imageHint: 'online shopping',
      buttonText: 'START SHOPPING',
      buttonLink: '/products'
    }
  },
  {
    id: 'subscription',
    title: 'SUBSCRIPTION',
    icon: Recycle,
    content: {
      title: 'JOIN THE CLUB',
      description: [
        "Never run out of your favorite cuts again with our flexible subscription service. Choose your box, select your frequency, and we'll take care of the rest. You can pause, skip, or cancel your subscription at any time.",
        "Subscribers get access to exclusive cuts, special offers, and early access to new products. It's the most convenient way to enjoy the best of Me'eat."
      ],
      image: 'subscription-box-1',
      imageHint: 'meat subscription',
      buttonText: 'GET STARTED',
      buttonLink: '/get-started'
    }
  }
];

export function MasterButchers() {
  const [activeTab, setActiveTab] = useState(tabsData[0].id);

  const activeTabData = tabsData.find(tab => tab.id === activeTab);

  return (
    <section className="bg-background py-16">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          <div className="md:col-span-1 lg:col-span-1">
            <div className="flex flex-col gap-2">
              {tabsData.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg transition-colors flex items-center gap-4",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                    <tab.icon className="h-6 w-6" />
                    <span className="font-semibold">{tab.title}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            {activeTabData && (
              <div
                className="relative bg-primary text-primary-foreground rounded-lg overflow-hidden p-8 lg:p-12 min-h-[500px] flex items-center"
              >
                <div className="absolute inset-0">
                    <Image 
                        src={getPlaceholderImage(activeTabData.content.image)}
                        alt={activeTabData.content.title}
                        fill
                        className="object-cover opacity-20"
                        data-ai-hint={activeTabData.content.imageHint}
                    />
                </div>
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="max-w-xl space-y-4">
                        <h2 className="text-3xl font-bold font-headline">{activeTabData.content.title}</h2>
                        {activeTabData.content.description.map((p, i) => <p key={i}>{p}</p>)}
                        <Button asChild variant="secondary" size="lg" className="mt-6">
                            <Link href={activeTabData.content.buttonLink || '#'}>{activeTabData.content.buttonText}</Link>
                        </Button>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

    