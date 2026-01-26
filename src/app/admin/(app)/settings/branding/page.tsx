'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getPlaceholderImage } from '@/lib/utils';
import { FirebaseError } from 'firebase/app';


export default function BrandingPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const settingsRef = useMemo(() => firestore ? doc(firestore, 'settings', 'branding') : null, [firestore]);
  const { data: brandingSettings, isLoading } = useDoc<{ logoUrl: string }>(settingsRef);

  const [logoPath, setLogoPath] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (brandingSettings?.logoUrl) {
      setLogoPath(brandingSettings.logoUrl);
    }
  }, [brandingSettings]);

  const handleSave = async () => {
    if (!logoPath || !firestore || !settingsRef) {
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Please enter a valid path for the logo.',
        });
        return;
    }
    setIsSaving(true);
    
    try {
        const dataToSave = { logoUrl: logoPath };
        await setDoc(settingsRef, dataToSave, { merge: true }).catch(async (error) => {
            const contextualError = await FirestorePermissionError.create({ path: settingsRef!.path, operation: 'write', requestResourceData: dataToSave });
            errorEmitter.emit('permission-error', contextualError);
            throw error;
        });

        toast({
            title: 'Logo Updated',
            description: 'Your new logo path has been saved.',
        });

    } catch (error) {
       if (!(error instanceof FirestorePermissionError) && !(error instanceof FirebaseError)) {
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: 'There was an error saving your logo path. Check permissions and try again.',
            });
        }
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Branding</h1>
        <p className="text-muted-foreground">Manage your sites appearance and branding.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>
            Enter the path to your logo image in your AWS S3 bucket. For example: `/logos/my-logo.png`.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="logo-path">Logo S3 Path</Label>
            <Input 
                id="logo-path" 
                type="text" 
                placeholder="/image.png"
                value={logoPath}
                onChange={(e) => setLogoPath(e.target.value)}
                disabled={isLoading}
             />
          </div>

          {logoPath && (
            <div>
              <Label>Logo Preview</Label>
              <div className="mt-2 w-48 rounded-md border p-4">
                <Image 
                    src={getPlaceholderImage(logoPath)} 
                    alt="Logo preview" 
                    width={192} 
                    height={100} 
                    className="object-contain" 
                    unoptimized // Important for dynamic S3 URLs
                />
              </div>
            </div>
          )}
          
          <div>
            <Button onClick={handleSave} disabled={isSaving || isLoading || !logoPath}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Save Logo Path
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
