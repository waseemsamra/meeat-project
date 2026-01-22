

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { placeholderImages as imagePlaceholders, cutTypeImages } from '@/lib/placeholder-images';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPlaceholderImage(id: string | undefined): string {
    const s3BaseUrl = 'https://primemeeat.s3.us-east-1.amazonaws.com';
    const allPlaceholders = [...imagePlaceholders, ...cutTypeImages];

    if (!id) {
        return 'https://picsum.photos/seed/placeholder/600/400';
    }
    
    // If it's already a full URL, return it directly.
    if (id.startsWith('http')) {
        return id;
    }

    // If it's a relative path, prepend the S3 base URL.
    if (id.startsWith('/')) {
        return `${s3BaseUrl}${id}`;
    }

    // Look for the ID in our placeholder collections.
    const image = allPlaceholders.find((img) => img.id === id);

    // If found, return its full URL.
    if (image && image.imageUrl) {
        // If the stored URL is relative, prepend the base URL
        if (image.imageUrl.startsWith('/')) {
            return `${s3BaseUrl}${image.imageUrl}`;
        }
        return image.imageUrl;
    }

    // If all else fails, return a generic placeholder.
    return `https://picsum.photos/seed/${id}/600/400`;
}
