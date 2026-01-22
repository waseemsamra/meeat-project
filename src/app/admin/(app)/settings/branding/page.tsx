
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useFirestore, useStorage, errorEmitter, FirestorePermissionError } from '@/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';


export default function BrandingPage() {
  const { toast } = useToast();
  const storage = useStorage();
  const firestore = useFirestore();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !logoPreview || !storage || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: 'Please select a file to upload.',
        });
        return;
    }
    setIsSaving(true);
    
    try {
        // 1. Upload the file to Firebase Storage
        const storageRef = ref(storage, `branding/logo`);
        const snapshot = await uploadString(storageRef, logoPreview, 'data_url', { contentType: selectedFile.type });
        const downloadURL = await getDownloadURL(snapshot.ref);

        // 2. Save the URL to Firestore
        const settingsRef = doc(firestore, 'settings', 'branding');
        const dataToSave = { logoUrl: downloadURL };
        await setDoc(settingsRef, dataToSave, { merge: true }).catch(async (error) => {
            const contextualError = await FirestorePermissionError.create({ path: settingsRef.path, operation: 'write', requestResourceData: dataToSave });
            errorEmitter.emit('permission-error', contextualError);
            throw error;
        });

        toast({
            title: 'Logo Updated',
            description: 'Your new logo has been saved.',
        });

    } catch (error) {
       if (!(error instanceof FirestorePermissionError)) {
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: 'There was an error saving your logo. Check permissions and try again.',
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
            Upload your company logo. This will be displayed in the site header. Recommended format: SVG or PNG.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="logo-upload">Logo file</Label>
            <Input id="logo-upload" type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          {logoPreview && (
            <div>
              <Label>Logo Preview</Label>
              <div className="mt-2 w-48 rounded-md border p-4">
                <Image src={logoPreview} alt="Logo preview" width={192} height={100} className="object-contain" />
              </div>
            </div>
          )}
          
          <div>
            <Button onClick={handleSave} disabled={isSaving || !logoPreview}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Save Logo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
