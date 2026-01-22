
'use client';

import { useState, useEffect, useCallback, MouseEvent } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getPlaceholderImage } from '@/lib/utils';

type ThumbProps = {
  selected: boolean;
  imgSrc: string;
  onClick: () => void;
  isVid?: boolean;
};

const Thumb: React.FC<ThumbProps> = ({ selected, imgSrc, onClick, isVid=false }) => (
  <div
    className={cn(
      'relative aspect-square flex-shrink-0 w-1/5 cursor-pointer opacity-50 transition-opacity',
      selected && 'opacity-100'
    )}
  >
    <button
      onClick={onClick}
      type="button"
      className="w-full h-full block rounded-md overflow-hidden bg-muted"
    >
      <Image
        src={getPlaceholderImage(imgSrc)}
        alt="Product thumbnail"
        fill
        className="object-contain"
      />
      {isVid && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <PlayCircle className="h-6 w-6 text-white" />
        </div>
      )}
    </button>
  </div>
);

interface ProductImageGalleryProps {
  images: string[];
  videos?: string[];
  productName: string;
}

export function ProductImageGallery({ images, videos = [], productName }: ProductImageGalleryProps) {
  const allMedia = [...images, ...videos];
  const [emblaRef, emblaApi] = useEmblaCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    const target = e.currentTarget.querySelector('img');
    if (target) {
        target.style.transformOrigin = `${x}% ${y}%`;
    }
  };

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {allMedia.map((mediaId, index) => (
            <div 
                key={index} 
                className="relative flex-[0_0_100%] aspect-square bg-muted rounded-lg overflow-hidden group/zoom"
                onMouseMove={handleMouseMove}
            >
               <Image
                  src={getPlaceholderImage(mediaId)}
                  alt={`${productName} image ${index + 1}`}
                  fill
                  className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover/zoom:scale-[2.5]"
                  priority={index === 0}
                  data-ai-hint={`${productName.toLowerCase()}`}
                />
            </div>
          ))}
        </div>
      </div>
      
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
        <Button onClick={scrollPrev} variant="outline" size="icon" className="rounded-full h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
        <Button onClick={scrollNext} variant="outline" size="icon" className="rounded-full h-8 w-8">
            <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs rounded-full px-2 py-1">
        {selectedIndex + 1} / {allMedia.length}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {allMedia.map((mediaId, index) => (
           <Thumb
            key={index}
            onClick={() => scrollTo(index)}
            selected={index === selectedIndex}
            imgSrc={mediaId}
            isVid={index >= images.length}
          />
        ))}
      </div>
    </div>
  );
}
