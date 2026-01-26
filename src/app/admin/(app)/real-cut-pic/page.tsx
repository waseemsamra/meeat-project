
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

export default function RealCutPicturesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Real Cut Pictures</h1>
        <p className="text-muted-foreground">
          Manage the real pictures of your meat cuts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mutton Summary</CardTitle>
          <CardDescription>
            A visual summary of mutton cuts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full aspect-[1.5]">
            <Image
              src="https://storage.googleapis.com/proud-diode-429312-r2.appspot.com/meeat/mutton-summary.png"
              alt="Mutton Summary"
              fill
              className="object-contain rounded-md border p-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

