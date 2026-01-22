
'use client';

import { MeeatLogo } from "@/components/icons";

export function ReportHeader() {
    return (
        <div className="flex items-center gap-6">
            <MeeatLogo className="h-24 w-24 flex-shrink-0" />
            <div>
                <h1 className="text-6xl font-bold font-headline">Me'Eat</h1>
                <p className="text-lg text-muted-foreground mt-1">Mazreat Al Wadi Dubai</p>
            </div>
        </div>
    )
}
