
'use client';

import { useLanguage } from "@/hooks/useLanguage";
import { ReactNode } from "react";

export function HtmlWithDirection({ children }: { children: ReactNode }) {
    const { languageDirection } = useLanguage();

    return (
        <html lang="en" suppressHydrationWarning dir={languageDirection}>
            {children}
        </html>
    );
}
