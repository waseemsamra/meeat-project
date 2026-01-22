
'use client';

import { SVGProps } from 'react';

export function MeeatLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      width="100"
      height="100"
      {...props}
    >
      <rect width="150" height="150" fill="#a03c31" rx="10" ry="10" />
      <text
        x="20"
        y="65"
        fontFamily="sans-serif"
        fontSize="50"
        fill="white"
        fontWeight="bold"
      >
        <tspan>ME</tspan>
      </text>
      <text
        x="20"
        y="125"
        fontFamily="sans-serif"
        fontSize="50"
        fill="white"
        fontWeight="bold"
      >
        <tspan>EAT</tspan>
      </text>
      <text
        x="135"
        y="145"
        fontFamily="sans-serif"
        fontSize="12"
        fill="#a03c31"
        fontWeight="bold"
        textAnchor="end"
      >
        <tspan>THE CHOP SHOP</tspan>
      </text>
    </svg>
  );
}


export function CleaverIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M17.28 9.22a4.63 4.63 0 0 0-6.55 0l-4.5 4.5a1.5 1.5 0 0 0 0 2.12l5.66 5.66a1.5 1.5 0 0 0 2.12 0l4.5-4.5a4.63 4.63 0 0 0 0-6.55Z" />
        <path d="m14 15 6-6" />
        <path d="M12.5 7.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" />
        <path d="M15.5 10.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" />
        <path d="M10.15 4.3a.5.5 0 0 0-.52-.52L2.5 8.52a.5.5 0 0 0 .52.52Z" />
        <path d="M7 11 2 16" />
    </svg>
  );
}

export function CowIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M22 13V7a2 2 0 0 0-2-2h-3.13a2 2 0 0 1-1.76-1.06L14 2.1a2 2 0 0 0-3.8 0L9 3.9a2 2 0 0 1-1.76 1.05H4a2 2 0 0 0-2 2v6" />
            <path d="M18.5 13.01a6.6 6.6 0 0 1-2.8 5.17 6.5 6.5 0 0 1-7.4 0 6.6 6.6 0 0 1-2.8-5.17" />
            <path d="M9 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
            <path d="M17 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
            <path d="M22 17v1c0 .5-.5 1-1 1h-1a1 1 0 0 1-1-1v-1" />
            <path d="M2 17v1c0 .5.5 1 1 1h1a1 1 0 0 0 1-1v-1" />
        </svg>
    )
}

export function LeafIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M11 20A7 7 0 0 1 4 13V7a7 7 0 0 1 14 0v6a7 7 0 0 1-7 7Z" />
            <path d="M12 20v-9" />
        </svg>
    );
}

export function TruckIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M5 18H3c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v10" />
            <path d="M14 18h7c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-1" />
            <path d="M12 18V6" />
            <path d="M12 6H8" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
        </svg>
    );
}
    

    